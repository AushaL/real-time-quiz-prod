import { filtersCacheKey, parseListParam, parseQuizFilters } from "./quiz-query";

describe("parseListParam", () => {
  it("splits comma separated values and trims them", () => {
    expect(parseListParam("1, 2 ,,3")).toEqual(["1", "2", "3"]);
  });

  it("accepts repeated query parameters", () => {
    expect(parseListParam(["live", "classic,offline"])).toEqual([
      "live",
      "classic",
      "offline",
    ]);
  });

  it("returns an empty list for missing values", () => {
    expect(parseListParam(undefined)).toEqual([]);
  });
});

describe("parseQuizFilters", () => {
  it("keeps valid values and silently drops unknown ones", () => {
    const filters = parseQuizFilters({
      difficulty: "1,9,2",
      type: "image,video",
      mode: "live,unknown",
    });

    expect(filters.difficulty).toEqual([1, 2]);
    expect(filters.types).toEqual(["image"]);
    expect(filters.modes).toEqual(["live"]);
  });

  it("defaults to createdAt desc when no valid sort is requested", () => {
    const filters = parseQuizFilters({ sortBy: "title" });

    expect(filters.sortBy).toBeNull();
    expect(filters.sortOrder).toBe("desc");
  });

  it("accepts a supported sort field and asc order", () => {
    const filters = parseQuizFilters({ sortBy: "difficulty", sortOrder: "asc" });

    expect(filters.sortBy).toBe("difficulty");
    expect(filters.sortOrder).toBe("asc");
  });

  it("produces a stable cache key regardless of input order", () => {
    const a = parseQuizFilters({ difficulty: "2,1", type: "audio,image" });
    const b = parseQuizFilters({ difficulty: "1,2", type: "image,audio" });

    expect(filtersCacheKey(a)).toBe(filtersCacheKey(b));
  });
});
