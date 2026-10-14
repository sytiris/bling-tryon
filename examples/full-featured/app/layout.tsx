import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Virtual Try-On - Full Featured Example",
  description:
    "Combines person detection, AI-generated prompts, and file upload",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-white">{children}</body>
    </html>
  );
}
