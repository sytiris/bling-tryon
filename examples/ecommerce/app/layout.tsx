import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "URBAN - Virtual Try-On",
  description:
    "Add real-time virtual try-on to your product pages with Decart",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
