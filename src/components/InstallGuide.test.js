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

test("renders difficulty, time, and part number", () => {
  render(<InstallGuide guide={guide} />);
  expect(screen.getByText(/Installation — Refrigerator Door Shelf Bin/)).toBeInTheDocument();
  expect(screen.getByText("PS11752778")).toBeInTheDocument();
  expect(screen.getByText("Easy")).toBeInTheDocument();
  expect(screen.getByText("Less than 15 mins")).toBeInTheDocument();
});

test("builds a YouTube thumbnail + watch link from the video URL", () => {
  render(<InstallGuide guide={guide} />);
  const link = screen.getByRole("link", { name: /watch the installation video/i });
  expect(link).toHaveAttribute("href", guide.videoUrl);
  expect(screen.getByAltText("Installation video")).toHaveAttribute(
    "src",
    "https://i.ytimg.com/vi/zSCNN6KpDE8/mqdefault.jpg"
  );
});

test("omits the video block when there is no video", () => {
  render(<InstallGuide guide={{ ...guide, videoUrl: null }} />);
  expect(screen.queryByText(/watch the installation video/i)).not.toBeInTheDocument();
});
