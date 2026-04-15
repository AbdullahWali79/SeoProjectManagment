import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "SEO Project Management",
  description: "Task assignment, progress tracking, and daily SEO team reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
