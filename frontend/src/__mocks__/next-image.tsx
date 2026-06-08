import React from "react";
// Minimal stub for next/image in jest/jsdom
const Image = ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { src: string; alt: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} {...props} />
);
export default Image;
