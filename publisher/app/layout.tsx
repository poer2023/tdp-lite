import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TDP 发布台",
  description: "tdp-lite 的轻量中文发布工作台",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
