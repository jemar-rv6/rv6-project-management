import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RV6 Project Command",
  description: "RV6 project portfolio, status, milestones, risks, and executive reporting.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
