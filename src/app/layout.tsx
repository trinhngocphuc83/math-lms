import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const viewport: Viewport = {
  themeColor: "#0f6f60",
};

export const metadata: Metadata = {
  title: "LMS TOÁN THẦY PHÚC",
  description: "Hệ thống quản lý học tập môn Toán",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Toán Thầy Phúc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.className}>
      <body className="flex h-screen overflow-hidden bg-background">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
