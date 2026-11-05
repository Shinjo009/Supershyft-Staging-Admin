import { describe, expect, it } from "vitest";
import { evaluateB2cTypeProGateStatus, b2cTypeNeedsProGate } from "./b2cMetsightsProGate";
import { emptyTypeDefaults } from "./settingsUtils";

describe("b2cTypeNeedsProGate", () => {
  it("applies to bio_ai and bio_ai_with_consultation", () => {
    expect(b2cTypeNeedsProGate("bio_ai")).toBe(true);
    expect(b2cTypeNeedsProGate("bio_ai_with_consultation")).toBe(true);
    expect(b2cTypeNeedsProGate("blood_test")).toBe(false);
  });
});

describe("evaluateB2cTypeProGateStatus", () => {
  const bootstrap = new Map<number, { diagnostic_package_id: number; package_name: string }>([
    [7, { diagnostic_package_id: 7, package_name: "Supershyft Core+" }],
  ]);

  it("blocks Metsights Pro when hormones are missing on the diagnostic package", () => {
    const defaults = { ...emptyTypeDefaults(2, 7), assessment_package_id: 2, diagnostic_package_id: 7 };
    const status = evaluateB2cTypeProGateStatus({
      typeCode: "bio_ai",
      displayName: "Bio AI",
      defaults,
      metsightsProPackageId: 2,
      keysByPackageId: new Map([[7, new Set(["glucose_fasting"])]]),
      loadingPackageIds: new Set(),
      diagnosticBootstrapById: bootstrap as never,
    });
    expect(status.blocked).toBe(true);
    expect(status.missingLabels).toContain("LH");
  });

  it("allows Metsights Pro when all hormones are present", () => {
    const defaults = { ...emptyTypeDefaults(2, 7), assessment_package_id: 2, diagnostic_package_id: 7 };
    const status = evaluateB2cTypeProGateStatus({
      typeCode: "bio_ai",
      displayName: "Bio AI",
      defaults,
      metsightsProPackageId: 2,
      keysByPackageId: new Map([[7, new Set(["lh", "fsh", "total_testosterone"])]]),
      loadingPackageIds: new Set(),
      diagnosticBootstrapById: bootstrap as never,
    });
    expect(status.blocked).toBe(false);
    expect(status.allowed).toBe(true);
  });
});
