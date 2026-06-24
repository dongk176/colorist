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

export const metadata: Metadata = {
  metadataBase: new URL("https://colorist-lake.vercel.app"),
  applicationName: "Colorist",
  title: "Colorist 홍대 디자이너 사전등록",
  description: "홍대 디자이너를 위한 Colorist 사전등록 페이지",
  icons: {
    icon: [
      {
        url: "/colorist-logo.png",
        type: "image/png",
        sizes: "2160x750",
      },
    ],
    shortcut: "/colorist-logo.png",
    apple: "/colorist-logo.png",
  },
  openGraph: {
    title: "Colorist 홍대 디자이너 사전등록",
    description: "네이버예약 링크만 남기면 프로필 초안을 만들어드려요.",
    url: "https://colorist-lake.vercel.app",
    siteName: "Colorist",
    images: [
      {
        url: "/colorist-logo.png",
        width: 2160,
        height: 750,
        alt: "Colorist",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Colorist 홍대 디자이너 사전등록",
    description: "네이버예약 링크만 남기면 프로필 초안을 만들어드려요.",
    images: ["/colorist-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
