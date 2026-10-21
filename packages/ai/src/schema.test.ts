import { describe, it, expect } from "vitest";
import { UserStoryOutputSchema, FibonacciPoints } from "./schema";

describe("UserStoryOutputSchema (INVEST principles validation)", () => {
  it("successfully parses a valid INVEST user story", () => {
    const validStory = {
      title: "Export sprint burndown chart to PDF format",
      story:
        "As a Scrum Master, I want to export our burndown chart to PDF, So that stakeholders receive sprint progress summaries.",
      acceptanceCriteria: [
        "Given active sprint data exists, When clicking 'Export PDF', Then a vector PDF report is downloaded within 3 seconds.",
        "Given empty sprint data, When clicking 'Export PDF', Then an informative warning modal is displayed.",
      ],
      estimatedPoints: "5",
      estimationRationale:
        "Requires SVG canvas rasterization and client PDF generation library integration.",
      subTasks: [
        "Integrate client-side PDF export library",
        "Add PDF download trigger to metrics toolbar",
        "Test across mobile and desktop viewports",
      ],
    };

    const parsed = UserStoryOutputSchema.parse(validStory);
    expect(parsed.title).toBe(validStory.title);
    expect(parsed.estimatedPoints).toBe("5");
    expect(parsed.acceptanceCriteria).toHaveLength(2);
    expect(parsed.subTasks).toHaveLength(3);
  });

  it("rejects non-Fibonacci complexity estimates", () => {
    const invalidStory = {
      title: "Add real-time card move animations",
      story:
        "As a developer, I want animations, So that state updates feel responsive.",
      acceptanceCriteria: [
        "Given a card move, When dropped, Then animate smoothly.",
      ],
      estimatedPoints: "4", // Invalid! Must be 1, 2, 3, 5, 8, 13
      estimationRationale: "CSS transforms",
      subTasks: ["Add CSS keyframes"],
    };

    expect(() => UserStoryOutputSchema.parse(invalidStory)).toThrow();
  });

  it("rejects story titles exceeding 80 characters", () => {
    const longTitleStory = {
      title:
        "This title is intentionally written to exceed eighty characters in length to verify our strict INVEST constraint",
      story:
        "As a user, I want concise titles, So that cards fit on Kanban lanes.",
      acceptanceCriteria: [
        "Given any story, When rendered, Then title is brief.",
      ],
      estimatedPoints: "2",
      estimationRationale: "Simple validation",
      subTasks: ["Add max length validator"],
    };

    expect(() => UserStoryOutputSchema.parse(longTitleStory)).toThrow();
  });

  it("rejects stories without acceptance criteria", () => {
    const storyWithoutCriteria = {
      title: "Setup email digest",
      story: "As a user, I want emails, So that I stay updated.",
      acceptanceCriteria: [], // Empty!
      estimatedPoints: "3",
      estimationRationale: "SMTP integration",
      subTasks: ["Configure SMTP"],
    };

    expect(() => UserStoryOutputSchema.parse(storyWithoutCriteria)).toThrow();
  });
});
