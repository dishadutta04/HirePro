import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ReactNode } from "react";
import { Inter } from "next/font/google";
import Splash from "@/components/Splash";
import { themeScript } from "@/lib/theme";

// Mac's San Francisco is used where installed (macOS / iOS); Inter is the closest match elsewhere.
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

export const metadata: Metadata = {
  title: "HireFlow AI",
  description: "AI-powered HR management: people, hiring, leave and payroll",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeaff" },
    { media: "(prefers-color-scheme: dark)", color: "#050507" },
  ],
};

// The theme class is set before first paint (saved choice, else system), so nothing flashes.

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <Splash />
        {children}
      </body>
    </html>
  );
}
