import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VOCs Breathomics DB",
  description: "Research and curation platform for VOC breathomics compounds"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
