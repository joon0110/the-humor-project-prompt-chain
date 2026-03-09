import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Humor Project",
  description: "Prompt Chain Tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
