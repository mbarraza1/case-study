import { render, screen } from "@testing-library/react";
import ProductCard from "./ProductCard";

const part = {
  partNumber: "PS11752778",
  name: "Refrigerator Door Shelf Bin",
  brand: "Whirlpool",
  applianceType: "Refrigerator",
  partType: "Tray or Shelf",
  price: 47.4,
  inStock: true,
  rating: 4.85,
  reviewCount: 351,
  difficulty: "Easy",
  hasVideo: true,
  url: "https://www.partselect.com/PS11752778.htm",
};

test("renders core product fields", () => {
  render(<ProductCard part={part} />);
  expect(screen.getByText("Refrigerator Door Shelf Bin")).toBeInTheDocument();
  expect(screen.getByText("PS11752778")).toBeInTheDocument();
  expect(screen.getByText("$47.40")).toBeInTheDocument();
  expect(screen.getByText("In stock")).toBeInTheDocument();
  expect(screen.getByText(/Easy install/)).toBeInTheDocument();
});

test("links out to the part page", () => {
  render(<ProductCard part={part} />);
  const link = screen.getByRole("link", { name: /view part/i });
  expect(link).toHaveAttribute("href", part.url);
});

test("shows out-of-stock state and price fallback", () => {
  render(<ProductCard part={{ ...part, inStock: false, price: null }} />);
  expect(screen.getByText("Out of stock")).toBeInTheDocument();
  expect(screen.getByText("Price n/a")).toBeInTheDocument();
});

test("renders the real product image (resolved against the API base) when present", () => {
  render(<ProductCard part={{ ...part, imageUrl: "/static/parts/PS11752778.png" }} />);
  const img = screen.getByRole("img", { name: /Refrigerator Door Shelf Bin/i });
  expect(img).toHaveAttribute("src", "http://localhost:8000/static/parts/PS11752778.png");
});

test("falls back to the generated tile when there is no image", () => {
  const { container } = render(<ProductCard part={{ ...part, imageUrl: null }} />);
  // generated tile is an inline svg
  expect(container.querySelector("svg.ps-thumb")).toBeInTheDocument();
});
