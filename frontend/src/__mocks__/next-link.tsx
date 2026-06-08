import React from "react";
// Minimal stub for next/link in jest/jsdom
const Link = ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
  <a href={href} {...props}>{children}</a>
);
export default Link;
