import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "Math LMS Dashboard",
  description: "Hệ thống quản lý học tập môn Toán",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.className}>
      <body className="flex h-screen overflow-hidden bg-background">
        {children}
      </body>
    </html>
  );
}
