import { render, screen } from "@testing-library/react";
import ProductCard from "./ProductCard";
import { Part } from "@/lib/types";

// Mock the api module
jest.mock("@/lib/api", () => ({
  addToCart: jest.fn().mockResolvedValue({ items: [], itemCount: 1 }),
}));

const part: Part = {
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
  installVideoUrl: "https://www.youtube.com/watch?v=zSCNN6KpDE8",
  url: "https://www.partselect.com/PS11752778.htm",
};

test("renders core product fields", () => {
  render(<ProductCard part={part} />);
  expect(screen.getByText("Refrigerator Door Shelf Bin")).toBeInTheDocument();
  expect(screen.getByText("PS11752778")).toBeInTheDocument();
  expect(screen.getByText("$47.40")).toBeInTheDocument();
  expect(screen.getByText("In stock")).toBeInTheDocument();
});

test("shows Add to Cart button for in-stock parts", () => {
  render(<ProductCard part={part} />);
  expect(screen.getByRole("button", { name: /add to cart/i })).toBeInTheDocument();
});

test("shows View part link for out-of-stock parts", () => {
  render(<ProductCard part={{ ...part, inStock: false }} />);
  const link = screen.getByRole("link", { name: /view part/i });
  expect(link).toHaveAttribute("href", part.url);
});

test("shows out-of-stock state", () => {
  render(<ProductCard part={{ ...part, inStock: false }} />);
  expect(screen.getByText("Out of stock")).toBeInTheDocument();
});

test("renders difficulty tag", () => {
  render(<ProductCard part={part} />);
  expect(screen.getByText(/Easy install/)).toBeInTheDocument();
});

test("renders video tag when hasVideo", () => {
  render(<ProductCard part={part} />);
  const videoLink = screen.getByRole("link", { name: /video/i });
  expect(videoLink).toHaveAttribute("href", part.installVideoUrl);
});

test("renders product image with /static/ path", () => {
  render(<ProductCard part={{ ...part, imageUrl: "/static/parts/PS11752778.jpg" }} />);
  const img = screen.getByRole("img", { name: part.name });
  expect(img).toHaveAttribute("src", "/static/parts/PS11752778.jpg");
});

test("renders product image with /api/image/ path", () => {
  render(<ProductCard part={{ ...part, imageUrl: "/api/image/PS11752778" }} />);
  const img = screen.getByRole("img", { name: part.name });
  expect(img).toHaveAttribute("src", "/api/image/PS11752778");
});

test("falls back to Thumbnail when no imageUrl", () => {
  const { container } = render(<ProductCard part={{ ...part, imageUrl: undefined }} />);
  expect(container.querySelector("svg")).toBeInTheDocument();
});
