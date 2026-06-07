import { render, screen, fireEvent } from "@testing-library/react";
import StarterScreen from "./StarterScreen";

test("renders action tiles", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  expect(screen.getByText("Find a part")).toBeInTheDocument();
  expect(screen.getByText("Search by model")).toBeInTheDocument();
  expect(screen.getByText("Installation help")).toBeInTheDocument();
  expect(screen.getByText("Troubleshoot")).toBeInTheDocument();
});

test("renders appliance pills", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  expect(screen.getByText("Refrigerator")).toBeInTheDocument();
  expect(screen.getByText("Dishwasher")).toBeInTheDocument();
});

test("renders example queries", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  expect(screen.getByText("How can I install part PS11752778?")).toBeInTheDocument();
});

test("calls onPrefill when action tile is clicked", () => {
  const onPrefill = jest.fn();
  render(<StarterScreen onSend={() => {}} onPrefill={onPrefill} />);
  fireEvent.click(screen.getByText("Find a part"));
  expect(onPrefill).toHaveBeenCalledWith("I'm looking for ");
});

test("calls onSend when appliance pill is clicked", () => {
  const onSend = jest.fn();
  render(<StarterScreen onSend={onSend} onPrefill={() => {}} />);
  fireEvent.click(screen.getByText("Refrigerator"));
  expect(onSend).toHaveBeenCalledWith("Show me popular refrigerator parts");
});

test("calls onSend when example is clicked", () => {
  const onSend = jest.fn();
  render(<StarterScreen onSend={onSend} onPrefill={() => {}} />);
  fireEvent.click(screen.getByText("How can I install part PS11752778?"));
  expect(onSend).toHaveBeenCalledWith("How can I install part PS11752778?");
});
