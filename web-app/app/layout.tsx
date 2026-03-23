import type { Metadata } from "next";
import { ReactNode } from "react";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Employee Time Tracking Dashboard",
  description: "PRD-aligned operations dashboard for multi-store time tracking",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
