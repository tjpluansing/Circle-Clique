import { countCompleted, toggleChecklistItem } from "./checklistProgress";

describe("toggleChecklistItem", () => {
  it("adds an id that isn't in the set yet", () => {
    const result = toggleChecklistItem(new Set(), "notifications");
    expect(result.has("notifications")).toBe(true);
  });

  it("removes an id that's already in the set", () => {
    const result = toggleChecklistItem(
      new Set(["notifications", "location"]),
      "notifications",
    );
    expect(result.has("notifications")).toBe(false);
    expect(result.has("location")).toBe(true);
  });

  it("never mutates the set passed in", () => {
    const original = new Set(["location"]);
    toggleChecklistItem(original, "notifications");
    expect(original.has("notifications")).toBe(false);
    expect(original.size).toBe(1);
  });
});

describe("countCompleted", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("counts only items that are both in the list and completed", () => {
    const completed = new Set(["b", "somethingElseEntirely"]);
    expect(countCompleted(items, completed)).toBe(1);
  });

  it("returns 0 when nothing is completed", () => {
    expect(countCompleted(items, new Set())).toBe(0);
  });

  it("returns the full count when everything is completed", () => {
    expect(countCompleted(items, new Set(["a", "b", "c"]))).toBe(3);
  });
});
