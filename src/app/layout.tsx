import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import ZaloWidget from "@/components/ZaloWidget";

export const metadata: Metadata = {
  title: "Chung Sức Liên Quân - Kéo Rương Nhanh & Uy Tín",
  description: "Hỗ trợ sự kiện Chung Sức Liên Quân Mobile 24/7, kéo rương nhanh chóng, an toàn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ZaloWidget />
      </body>
    </html>
  );
}
