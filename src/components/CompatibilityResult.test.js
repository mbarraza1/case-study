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
