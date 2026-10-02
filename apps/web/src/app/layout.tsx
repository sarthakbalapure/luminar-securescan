import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LuminarIQ SecureScan",
  description: "AI-powered security audit platform for websites, applications, and APIs."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
