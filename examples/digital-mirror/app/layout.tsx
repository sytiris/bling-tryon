import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digital Mirror - Virtual Try-On",
  description:
    "Two-device virtual try-on: a display screen shows the camera + AI output, a phone selects products via QR code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-black text-white">{children}</body>
    </html>
  );
}
