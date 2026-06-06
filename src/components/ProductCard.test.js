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
