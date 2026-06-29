import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Vigilance Case Manager",
  description: "Internal vigilance case tracking and investigation tool",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const theme = c.get("theme")?.value;
  const isDark = theme === "dark";

  return (
    <html lang="en" className={`${inter.variable}${isDark ? " dark" : ""}`} suppressHydrationWarning>
      <body className="font-sans">{children}</body>
    </html>
  );
}
