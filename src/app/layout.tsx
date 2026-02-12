import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "カルテ＆SNS投稿 - 美容師支援ツール",
  description:
    "施術メニューとメモを入力するだけで、カルテ用テキストとInstagram投稿文をAIが瞬時に生成。美容師の業務効率化ツール。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#fdf2f4" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
