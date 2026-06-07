import { render, screen } from "@testing-library/react";
import CartPanel from "./CartPanel";
import { Part } from "@/lib/types";

jest.mock("@/lib/api", () => ({
  removeFromCart: jest.fn().mockResolvedValue({ items: [] }),
}));

const mockItems: Part[] = [
  {
    partNumber: "PS11752778",
    name: "Refrigerator Door Shelf Bin",
    brand: "Whirlpool",
    price: 47.4,
    quantity: 2,
    imageUrl: "/static/parts/PS11752778.jpg",
    url: "https://www.partselect.com/PS11752778.htm",
  },
  {
    partNumber: "PS3406971",
    name: "Dishwasher Lower Dishrack Wheel",
    brand: "Whirlpool",
    price: 9.86,
    quantity: 1,
    imageUrl: null,
    url: "https://www.partselect.com/PS3406971.htm",
  },
];

test("renders empty cart state", () => {
  render(<CartPanel items={[]} onClose={() => {}} onUpdate={() => {}} />);
  expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
});

test("renders cart items with names and prices", () => {
  render(<CartPanel items={mockItems} onClose={() => {}} onUpdate={() => {}} />);
  expect(screen.getByText("Refrigerator Door Shelf Bin")).toBeInTheDocument();
  expect(screen.getByText("Dishwasher Lower Dishrack Wheel")).toBeInTheDocument();
  expect(screen.getByText("$94.80")).toBeInTheDocument(); // 47.4 * 2
  expect(screen.getByText("$9.86")).toBeInTheDocument();
});

test("shows total price", () => {
  render(<CartPanel items={mockItems} onClose={() => {}} onUpdate={() => {}} />);
  expect(screen.getByText("$104.66")).toBeInTheDocument();
});

test("shows Buy on PartSelect links", () => {
  render(<CartPanel items={mockItems} onClose={() => {}} onUpdate={() => {}} />);
  const links = screen.getAllByRole("link", { name: /buy.*partselect/i });
  expect(links).toHaveLength(2);
});

test("shows item count in header", () => {
  render(<CartPanel items={mockItems} onClose={() => {}} onUpdate={() => {}} />);
  expect(screen.getByText("(3)")).toBeInTheDocument();
});

test("shows remove buttons", () => {
  render(<CartPanel items={mockItems} onClose={() => {}} onUpdate={() => {}} />);
  const removeButtons = screen.getAllByRole("button", { name: /remove/i });
  expect(removeButtons).toHaveLength(2);
});
