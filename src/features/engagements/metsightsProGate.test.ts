import { describe, expect, it } from "vitest";
import {
  isMetsightsProGateResolved,
  shouldResetDisallowedMetsightsPro,
} from "./metsightsProGate";

describe("shouldResetDisallowedMetsightsPro", () => {
  const proId = 42;

  it("keeps a saved Metsights Pro package while the hormone check is still running", () => {
    expect(
      shouldResetDisallowedMetsightsPro({
        applyGate: true,
        gateResolved: false,
        selectedPackageId: proId,
        metsightsProPackageId: proId,
        allowed: false,
      }),
    ).toBe(false);
  });

  it("keeps Metsights Pro after the diagnostic package is confirmed to include the hormones", () => {
    expect(
      shouldResetDisallowedMetsightsPro({
        applyGate: true,
        gateResolved: true,
        selectedPackageId: proId,
        metsightsProPackageId: proId,
        allowed: true,
      }),
    ).toBe(false);
  });

  it("clears Metsights Pro only after the check finds the hormones missing", () => {
    expect(
      shouldResetDisallowedMetsightsPro({
        applyGate: true,
        gateResolved: true,
        selectedPackageId: proId,
        metsightsProPackageId: proId,
        allowed: false,
      }),
    ).toBe(true);
  });

  it("leaves a different assessment package selected", () => {
    expect(
      shouldResetDisallowedMetsightsPro({
        applyGate: true,
        gateResolved: true,
        selectedPackageId: 7,
        metsightsProPackageId: proId,
        allowed: false,
      }),
    ).toBe(false);
  });
});

describe("isMetsightsProGateResolved", () => {
  it("stays unresolved until the lookup for the current diagnostic package finishes", () => {
    expect(isMetsightsProGateResolved(true, 9, null)).toBe(false);
    expect(isMetsightsProGateResolved(true, 9, 8)).toBe(false);
    expect(isMetsightsProGateResolved(true, 9, 9)).toBe(true);
  });

  it("is resolved when the gate is off or no diagnostic package is selected", () => {
    expect(isMetsightsProGateResolved(false, 9, null)).toBe(true);
    expect(isMetsightsProGateResolved(true, undefined, null)).toBe(true);
  });
});
