import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humor Project Prompt Chains",
  description: "Prompt chain tooling for The Humor Project.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="theme-preference" strategy="beforeInteractive">{`
          (function() {
            try {
              var pref = localStorage.getItem("theme-preference");
              var root = document.documentElement;
              if (pref === "light" || pref === "dark") {
                root.setAttribute("data-theme", pref);
              } else {
                root.removeAttribute("data-theme");
              }
            } catch (e) {}
          })();
        `}</Script>
        {children}
      </body>
    </html>
  );
}
