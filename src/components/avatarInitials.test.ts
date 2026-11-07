import { getInitials } from "./avatarInitials";

describe("getInitials", () => {
  it("uses the first letter of the first and last word for a full name", () => {
    expect(getInitials("Karla Luansing")).toBe("KL");
  });

  it("uses the first two letters of a single-word name", () => {
    expect(getInitials("Mom")).toBe("MO");
  });

  it("ignores extra middle words, only using the first and last", () => {
    expect(getInitials("Maria Clara De Santos")).toBe("MS");
  });

  it("collapses repeated whitespace", () => {
    expect(getInitials("  Karla   Luansing  ")).toBe("KL");
  });

  it("is uppercase regardless of input case", () => {
    expect(getInitials("karla luansing")).toBe("KL");
  });

  it("returns an empty string for an empty name rather than throwing", () => {
    expect(getInitials("")).toBe("");
    expect(getInitials("   ")).toBe("");
  });
});
