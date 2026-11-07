import { t } from "./index";

describe("i18n t()", () => {
  it("resolves a nested key", () => {
    expect(t("common.cancel")).toBe("Cancel");
  });

  it("interpolates variables", () => {
    expect(t("sos.countdownAnnouncement", { circleName: "Mom's Circle" })).toBe(
      "Alerting Mom's Circle",
    );
  });

  it("falls back to the key itself when missing, instead of throwing", () => {
    // @ts-expect-error - intentionally invalid key for this test
    expect(t("nope.missing")).toBe("nope.missing");
  });
});
