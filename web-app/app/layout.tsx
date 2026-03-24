import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-dashboard",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Time & attendance",
  description: "Clock in and out, record breaks, and calculate regular, overtime, and double time by your rules.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
