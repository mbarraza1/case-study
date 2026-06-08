import { render, screen, fireEvent } from "@testing-library/react";
import StarterScreen from "./StarterScreen";

test("renders appliance selection buttons", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  expect(screen.getByText("Refrigerator")).toBeInTheDocument();
  expect(screen.getByText("Dishwasher")).toBeInTheDocument();
});

test("renders example queries", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  expect(screen.getByText("How can I install part PS11752778?")).toBeInTheDocument();
});

test("shows options after selecting Refrigerator", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  fireEvent.click(screen.getByText("Refrigerator"));
  expect(screen.getByText("Browse parts")).toBeInTheDocument();
  expect(screen.getByText("Ice maker issues")).toBeInTheDocument();
  expect(screen.getByText("Leaking")).toBeInTheDocument();
  expect(screen.getByText("Temperature problems")).toBeInTheDocument();
});

test("shows options after selecting Dishwasher", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  fireEvent.click(screen.getByText("Dishwasher"));
  expect(screen.getByText("Browse parts")).toBeInTheDocument();
  expect(screen.getByText("Won't drain")).toBeInTheDocument();
  expect(screen.getByText("Making noise")).toBeInTheDocument();
});

test("calls onSend when a direct option is clicked", () => {
  const onSend = jest.fn();
  render(<StarterScreen onSend={onSend} onPrefill={() => {}} />);
  fireEvent.click(screen.getByText("Refrigerator"));
  fireEvent.click(screen.getByText("Ice maker issues"));
  expect(onSend).toHaveBeenCalledWith("My ice maker is not working");
});

test("calls onPrefill for options ending with a space", () => {
  const onPrefill = jest.fn();
  render(<StarterScreen onSend={() => {}} onPrefill={onPrefill} />);
  fireEvent.click(screen.getByText("Dishwasher"));
  fireEvent.click(screen.getByText("Troubleshoot a problem"));
  expect(onPrefill).toHaveBeenCalledWith("My dishwasher is ");
});

test("back button returns to appliance selection", () => {
  render(<StarterScreen onSend={() => {}} onPrefill={() => {}} />);
  fireEvent.click(screen.getByText("Refrigerator"));
  expect(screen.queryByText("Dishwasher")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("← Back"));
  expect(screen.getByText("Dishwasher")).toBeInTheDocument();
});

test("calls onSend when example is clicked", () => {
  const onSend = jest.fn();
  render(<StarterScreen onSend={onSend} onPrefill={() => {}} />);
  fireEvent.click(screen.getByText("How can I install part PS11752778?"));
  expect(onSend).toHaveBeenCalledWith("How can I install part PS11752778?");
});
