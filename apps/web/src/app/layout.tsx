import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export const metadata: Metadata = {
  title: {
    default: "Workstation — Monetize your AI expertise",
    template: "%s | Workstation",
  },
  description:
    "Package the AI stack you've built — vendors, prompts, agent loops — as a metered API + CLI + MCP your clients' agents pay to call.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
