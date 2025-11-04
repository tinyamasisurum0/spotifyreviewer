import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://myrating.space";
const siteName = "myrating.space";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Spotify Album Reviewer | myrating.space",
    template: "%s | myrating.space",
  },
  description:
    "Build Spotify album roundups in minutes. Rank favorites, add ratings and notes, then export a shareable review image for your playlist.",
  keywords: [
    "Spotify playlist review",
    "album ranking generator",
    "music review template",
    "playlist analyzer",
    "music rating tool",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Spotify Album Reviewer",
    description:
      "Analyze Spotify playlists, curate album rankings, and export ready-to-share review graphics.",
    url: "/",
    siteName,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spotify Album Reviewer",
    description:
      "Curate your favorite Spotify albums, add ratings and notes, and export a polished review image.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  themeColor: "#10B981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-900`}
      >
        <header className="sticky top-0 z-40 border-b border-green-500/40 bg-gradient-to-r from-gray-950/85 via-gray-900/80 to-gray-950/85 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-4 text-sm text-gray-200 sm:h-16 sm:px-6 lg:px-10">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold tracking-wide sm:text-xl"
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 text-gray-900 shadow-lg">
                <span className="text-sm font-bold">MR</span>
              </span>
              <span className="text-lg text-emerald-100 sm:text-2xl">
                myrating<span className="text-emerald-300">.space</span>
              </span>
            </Link>
            <HeaderNav />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
