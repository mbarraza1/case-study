import { render, screen } from "@testing-library/react";
import InstallGuide from "./InstallGuide";

const guide = {
  partNumber: "PS11752778",
  name: "Refrigerator Door Shelf Bin",
  difficulty: "Easy",
  installTime: "Less than 15 mins",
  videoUrl: "https://www.youtube.com/watch?v=zSCNN6KpDE8",
  url: "https://www.partselect.com/PS11752778.htm",
};

test("renders part name and number", () => {
  render(<InstallGuide guide={guide} />);
  expect(screen.getByText(/Refrigerator Door Shelf Bin/)).toBeInTheDocument();
  expect(screen.getByText("PS11752778")).toBeInTheDocument();
});

test("renders difficulty and time", () => {
  render(<InstallGuide guide={guide} />);
  expect(screen.getByText("Easy")).toBeInTheDocument();
  expect(screen.getByText("Less than 15 mins")).toBeInTheDocument();
});

test("renders video thumbnail with YouTube link", () => {
  render(<InstallGuide guide={guide} />);
  const link = screen.getByRole("link", { name: /installation video/i });
  expect(link).toHaveAttribute("href", guide.videoUrl);
  const img = screen.getByRole("img", { name: /installation video/i });
  expect(img).toHaveAttribute("src", "https://i.ytimg.com/vi/zSCNN6KpDE8/mqdefault.jpg");
});

test("renders PartSelect link", () => {
  render(<InstallGuide guide={guide} />);
  const link = screen.getByRole("link", { name: /full instructions/i });
  expect(link).toHaveAttribute("href", guide.url);
});

test("hides video section when no videoUrl", () => {
  render(<InstallGuide guide={{ ...guide, videoUrl: undefined }} />);
  expect(screen.queryByRole("img", { name: /installation video/i })).not.toBeInTheDocument();
});
