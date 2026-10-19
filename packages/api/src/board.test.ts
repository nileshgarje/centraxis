import { describe, it, expect } from "vitest";

describe("Kanban Board & Fractional Midpoint Ranking Logic", () => {
  function calculateMidpointRank(
    prevRank: number | null,
    nextRank: number | null,
    defaultFallback = 1000,
  ): number {
    if (prevRank === null && nextRank === null) {
      return defaultFallback;
    } else if (prevRank === null && nextRank !== null) {
      return nextRank / 2;
    } else if (prevRank !== null && nextRank === null) {
      return prevRank + 1000;
    } else {
      return (prevRank! + nextRank!) / 2;
    }
  }

  it("calculates initial rank when inserting into an empty column", () => {
    const rank = calculateMidpointRank(null, null);
    expect(rank).toBe(1000);
  });

  it("calculates midpoint rank when prepending before the first card", () => {
    const rank = calculateMidpointRank(null, 1000);
    expect(rank).toBe(500);
  });

  it("calculates midpoint rank when appending after the last card", () => {
    const rank = calculateMidpointRank(2000, null);
    expect(rank).toBe(3000);
  });

  it("calculates exact midpoint between two sibling cards", () => {
    const rank = calculateMidpointRank(1000, 2000);
    expect(rank).toBe(1500);
  });

  it("supports arbitrary fractional precision without collisions", () => {
    const rank1 = calculateMidpointRank(1500, 1600);
    expect(rank1).toBe(1550);

    const rank2 = calculateMidpointRank(1500, 1550);
    expect(rank2).toBe(1525);
  });
});

describe("Board Status Transitions & Subtask Completion Guardrail", () => {
  interface Subtask {
    id: string;
    key: string;
    status: string;
  }

  function validateDoneTransition(subtasks: Subtask[]): {
    allowed: boolean;
    error?: string;
  } {
    const incomplete = subtasks.filter((s) => s.status !== "DONE");
    if (incomplete.length > 0) {
      const keys = incomplete.map((s) => s.key).join(", ");
      return {
        allowed: false,
        error: `Cannot resolve work item while child subtasks are incomplete (${keys}).`,
      };
    }
    return { allowed: true };
  }

  it("blocks moving story to DONE when unfinished subtasks exist", () => {
    const subtasks = [
      { id: "1", key: "CTX-5", status: "DONE" },
      { id: "2", key: "CTX-6", status: "TODO" },
    ];

    const result = validateDoneTransition(subtasks);
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("CTX-6");
  });

  it("permits moving story to DONE when all subtasks are DONE", () => {
    const subtasks = [
      { id: "1", key: "CTX-5", status: "DONE" },
      { id: "2", key: "CTX-6", status: "DONE" },
    ];

    const result = validateDoneTransition(subtasks);
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("permits moving story to DONE when no subtasks exist", () => {
    const result = validateDoneTransition([]);
    expect(result.allowed).toBe(true);
  });
});
