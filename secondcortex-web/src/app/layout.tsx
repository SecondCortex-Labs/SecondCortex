import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import LenisProvider from "@/components/landing/LenisProvider";
import CursorLayer from "@/components/CursorLayer";

export const metadata: Metadata = {
  title: "SecondCortex — Live Context Graph",
  description: "Real-time visualization of the SecondCortex agent reasoning network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} antialiased selection:bg-accent-green selection:text-white`}
      >
        <LenisProvider>
          {children}
          <CursorLayer />
        </LenisProvider>
      </body>
    </html>
  );
}
