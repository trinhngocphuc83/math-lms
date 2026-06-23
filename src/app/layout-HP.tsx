import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LMS TOÁN THẦY PHÚC',
  description: 'Hệ thống Quản lý Đào tạo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
