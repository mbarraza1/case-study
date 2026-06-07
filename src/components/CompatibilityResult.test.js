import { render, screen } from "@testing-library/react";
import CompatibilityResult from "./CompatibilityResult";

test("renders an incompatible verdict with reason", () => {
  render(
    <CompatibilityResult
      result={{
        partNumber: "PS11752778",
        modelNumber: "WDT780SAEM1",
        compatible: false,
        confidence: "high",
        reason: "PS11752778 is a refrigerator part, but WDT780SAEM1 is a dishwasher.",
        part: null,
      }}
    />
  );
  expect(screen.getByText("Not compatible")).toBeInTheDocument();
  expect(screen.getByText(/high confidence/)).toBeInTheDocument();
  expect(screen.getByText(/is a refrigerator part/)).toBeInTheDocument();
});

test("renders a compatible verdict", () => {
  render(
    <CompatibilityResult
      result={{
        partNumber: "PS3406971",
        modelNumber: "WDT780SAEM1",
        compatible: true,
        confidence: "high",
        reason: "Yes — confirmed compatible.",
        part: null,
      }}
    />
  );
  expect(screen.getByText("Compatible")).toBeInTheDocument();
});

test("renders a model-level compatibility banner (no partNumber)", () => {
  render(
    <CompatibilityResult
      result={{
        partNumber: null,
        modelNumber: "GNE27JYMWFFS",
        compatible: true,
        confidence: "high",
        reason: "All 8 parts below are confirmed compatible with model GNE27JYMWFFS.",
        part: null,
      }}
    />
  );
  expect(screen.getByText("Compatible")).toBeInTheDocument();
  expect(screen.getAllByText(/GNE27JYMWFFS/).length).toBeGreaterThan(0);
  expect(screen.getByText(/All 8 parts below/)).toBeInTheDocument();
  // Should NOT render "↔ model" since there's no partNumber
  expect(screen.queryByText(/↔/)).not.toBeInTheDocument();
});

test("renders an uncertain verdict", () => {
  render(
    <CompatibilityResult
      result={{
        partNumber: "PS3406971",
        modelNumber: "ZZZ999",
        compatible: null,
        confidence: "unknown",
        reason: "I don't have that model in my data.",
        part: null,
      }}
    />
  );
  expect(screen.getByText("Couldn't confirm")).toBeInTheDocument();
});
