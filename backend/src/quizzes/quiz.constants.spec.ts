import { expectedQuestionCount } from "./quiz.constants";

describe("expectedQuestionCount", () => {
  it.each([
    [1, 4],
    [2, 8],
    [3, 12],
    [4, 16],
  ])("maps difficulty %i to %i questions", (difficulty, expected) => {
    expect(expectedQuestionCount(difficulty)).toBe(expected);
  });

  it("returns null for an unsupported difficulty", () => {
    expect(expectedQuestionCount(5)).toBeNull();
  });
});
