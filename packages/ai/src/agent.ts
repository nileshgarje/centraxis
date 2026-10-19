import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { env } from "@centraxis/env";
import { UserStoryOutputSchema, type UserStoryOutput } from "./schema";

const SYSTEM_PROMPT = `
You are an expert Agile Scrum Master and Principal Software Architect specializing in the INVEST principles:
- I (Independent): The story should be self-contained and deliverable without hard coupling.
- N (Negotiable): Captures essence rather than rigid implementation contracts.
- V (Valuable): Delivers clear business or customer value.
- E (Estimable): Scoped with enough clarity to accurately estimate.
- S (Small): Fits comfortably within a single sprint iteration (1 to 8 story points).
- T (Testable): Defined with rigorous, unambiguous acceptance criteria.

Output Format Requirements:
1. title: Max 80 characters, crisp, action-oriented.
2. story: Strict "As a <role>, I want <feature/capability>, So that <benefit/outcome>".
3. acceptanceCriteria: Array of string criteria adhering strictly to Gherkin syntax: "Given <prerequisite>, When <trigger>, Then <verification>".
4. estimatedPoints: One of Fibonacci scale ["1", "2", "3", "5", "8", "13"].
5. estimationRationale: Explain the technical complexity, risk, and dependencies justifying the point estimate.
6. subTasks: 3 to 6 technical implementation tasks (e.g., schema migration, API endpoint, UI component, unit tests).
`.trim();

/**
 * Fallback generator for offline/local environments or missing API keys
 */
function generateSimulatedStory(
  prompt: string,
  projectContext?: string,
): UserStoryOutput {
  const cleanPrompt = prompt.trim();
  const contextPrefix = projectContext ? `[${projectContext}] ` : "";

  return {
    title: `${contextPrefix}${cleanPrompt.slice(0, 60)}`.trim(),
    story: `As an agile team member, I want ${cleanPrompt}, So that our platform delivers high-quality user value with complete observability.`,
    acceptanceCriteria: [
      `Given ${cleanPrompt} is implemented, When the user triggers the feature workflow, Then the system completes the action successfully within SLA.`,
      `Given invalid input or network latency, When the user executes the flow, Then informative error states are displayed with recovery actions.`,
      `Given state changes take place, When viewed across distributed sessions, Then all clients reflect the updated data consistently.`,
    ],
    estimatedPoints: "5",
    estimationRationale:
      "Moderate complexity involving API procedure definitions, database schema synchronization, and responsive UI state management.",
    subTasks: [
      `Design and validate data contract for "${cleanPrompt.slice(0, 30)}"`,
      "Implement type-safe tRPC procedure with contextual RBAC authorization",
      "Develop responsive UI component with loading and error boundaries",
      "Write automated integration tests verifying edge cases and regression safety",
    ],
  };
}

export interface GenerateStoryOptions {
  prompt: string;
  projectContext?: string;
}

/**
 * AI Story Agent: Converts raw feature prompts into structured INVEST-compliant user stories
 */
export async function generateStoryAgent(
  opts: GenerateStoryOptions,
): Promise<{ story: UserStoryOutput; modelUsed: string }> {
  const { prompt, projectContext } = opts;

  const apiKey = env.OPENAI_API_KEY;
  const isMockMode =
    !apiKey ||
    apiKey.includes("placeholder") ||
    apiKey.startsWith("sk-placeholder") ||
    apiKey.length < 10;

  if (isMockMode) {
    return {
      story: generateSimulatedStory(prompt, projectContext),
      modelUsed: "mock-invest-agent-v1",
    };
  }

  try {
    const { object: story } = await generateObject({
      model: openai("gpt-4o"),
      system: SYSTEM_PROMPT,
      prompt: `Feature brief: "${prompt}"${
        projectContext ? `\nProject context: "${projectContext}"` : ""
      }`,
      schema: UserStoryOutputSchema,
    });

    return {
      story,
      modelUsed: "gpt-4o",
    };
  } catch (error) {
    console.warn(
      "OpenAI generation failed or rate-limited, falling back to simulated INVEST generator:",
      error,
    );
    return {
      story: generateSimulatedStory(prompt, projectContext),
      modelUsed: "fallback-invest-agent-v1",
    };
  }
}
