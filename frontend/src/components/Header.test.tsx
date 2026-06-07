import { render, screen, fireEvent } from "@testing-library/react";
import Header from "./Header";

test("renders the PartSelect header title", () => {
  render(<Header cartCount={0} onCartClick={() => {}} />);
  expect(screen.getByText("Parts Assistant")).toBeInTheDocument();
  expect(screen.getByText(/Refrigerator/)).toBeInTheDocument();
});

test("shows cart badge when count > 0", () => {
  render(<Header cartCount={3} onCartClick={() => {}} />);
  expect(screen.getByText("3")).toBeInTheDocument();
});

test("hides cart badge when count is 0", () => {
  const { container } = render(<Header cartCount={0} onCartClick={() => {}} />);
  expect(container.querySelector(".ps-cart-badge")).not.toBeInTheDocument();
});

test("calls onCartClick when cart button is clicked", () => {
  const onClick = jest.fn();
  render(<Header cartCount={0} onCartClick={onClick} />);
  fireEvent.click(screen.getByRole("button", { name: /open cart/i }));
  expect(onClick).toHaveBeenCalledTimes(1);
});
