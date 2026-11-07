import { colors, statusTones } from "./tokens";

describe("design tokens", () => {
  it("reserves emergency red only for the emergency token", () => {
    const nonEmergencyColors = Object.entries(colors)
      .filter(([key]) => key !== "emergency")
      .map(([, value]) => value);
    expect(nonEmergencyColors).not.toContain(colors.emergency);
  });

  it("pairs every status tone with a color and a word (never color alone)", () => {
    for (const tone of Object.values(statusTones)) {
      expect(tone.color).toBeTruthy();
      expect(tone.word.length).toBeGreaterThan(0);
    }
  });
});
