import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GBread Blog Writer",
  description: "YouTube 영상을 분석해 블로그 초안을 만드는 사내용 작성 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
