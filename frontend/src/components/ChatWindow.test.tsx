import { render, screen, fireEvent } from "@testing-library/react";
import ChatWindow from "./ChatWindow";

// Mock the api module to prevent actual network calls
jest.mock("@/lib/api", () => ({
  streamChat: jest.fn(),
  addToCart: jest.fn(),
}));

// Mock marked (ESM module)
jest.mock("marked", () => ({
  marked: { parse: (text: string) => text },
}));

test("renders the welcome message", () => {
  render(<ChatWindow />);
  expect(screen.getAllByText(/PartSelect Assistant/).length).toBeGreaterThan(0);
});

test("renders the input textarea", () => {
  render(<ChatWindow />);
  expect(screen.getByPlaceholderText(/ask about/i)).toBeInTheDocument();
});

test("send button is disabled when input is empty", () => {
  render(<ChatWindow />);
  const btn = screen.getByRole("button", { name: /send/i });
  expect(btn).toBeDisabled();
});

test("send button is enabled when input has text", () => {
  render(<ChatWindow />);
  const textarea = screen.getByPlaceholderText(/ask about/i);
  fireEvent.change(textarea, { target: { value: "Hello" } });
  const btn = screen.getByRole("button", { name: /send/i });
  expect(btn).not.toBeDisabled();
});

test("shows StarterScreen before first user message", () => {
  render(<ChatWindow />);
  expect(screen.getByText("Find a part")).toBeInTheDocument();
});

test("renders the PS avatar for assistant messages", () => {
  render(<ChatWindow />);
  expect(screen.getByText("PS")).toBeInTheDocument();
});
