import { render } from "@testing-library/react";
import Thumbnail from "./Thumbnail";

test("renders an SVG with the correct aria-label", () => {
  const { container } = render(<Thumbnail part={{ partNumber: "PS11752778", name: "Door Shelf", applianceType: "Refrigerator" }} />);
  const svg = container.querySelector("svg");
  expect(svg).toBeInTheDocument();
  expect(svg).toHaveAttribute("aria-label", "Door Shelf");
});

test("renders fridge glyph for Refrigerator parts", () => {
  const { container } = render(<Thumbnail part={{ partNumber: "PS1", name: "Test", applianceType: "Refrigerator" }} />);
  // Fridge has a horizontal line at y1="22"
  expect(container.querySelector("line[y1='22']")).toBeInTheDocument();
});

test("renders dishwasher glyph for Dishwasher parts", () => {
  const { container } = render(<Thumbnail part={{ partNumber: "PS2", name: "Test", applianceType: "Dishwasher" }} />);
  // Dishwasher has a circle at cx="25" cy="29"
  expect(container.querySelector("circle[cx='25']")).toBeInTheDocument();
});

test("uses consistent color based on partNumber", () => {
  const { container: c1 } = render(<Thumbnail part={{ partNumber: "PS123", name: "A" }} />);
  const { container: c2 } = render(<Thumbnail part={{ partNumber: "PS123", name: "A" }} />);
  const fill1 = c1.querySelector("rect")?.getAttribute("fill");
  const fill2 = c2.querySelector("rect")?.getAttribute("fill");
  expect(fill1).toBe(fill2);
});

test("respects custom size prop", () => {
  const { container } = render(<Thumbnail part={{ partNumber: "PS1", name: "T" }} size={80} />);
  const svg = container.querySelector("svg");
  expect(svg).toHaveAttribute("width", "80");
  expect(svg).toHaveAttribute("height", "80");
});
