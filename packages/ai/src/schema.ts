import { z } from "zod";

/**
 * Fibonacci story points scale for agile estimation
 */
export const FibonacciPoints = ["1", "2", "3", "5", "8", "13"] as const;

/**
 * Zod schema defining structured INVEST-compliant user story output
 */
export const UserStoryOutputSchema = z.object({
  title: z
    .string()
    .max(80, "Story title must not exceed 80 characters")
    .describe("Concise action-oriented title in active voice"),
  story: z
    .string()
    .describe(
      "Standard user story formulation: As a <role>, I want <capability>, So that <business value/benefit>",
    ),
  acceptanceCriteria: z
    .array(z.string())
    .min(1, "At least one acceptance criterion is required")
    .describe(
      "Gherkin scenarios formatted as 'Given <context>, When <action>, Then <expected outcome>'",
    ),
  estimatedPoints: z
    .enum(FibonacciPoints)
    .describe("Fibonacci complexity estimate (1, 2, 3, 5, 8, 13)"),
  estimationRationale: z
    .string()
    .describe("Engineering justification for the chosen story point estimate"),
  subTasks: z
    .array(z.string())
    .min(1, "At least one technical subtask must be specified")
    .describe(
      "Actionable technical breakdown tasks required to deliver this story",
    ),
});

export type UserStoryOutput = z.infer<typeof UserStoryOutputSchema>;
