import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "../context/AuthContext";
import Sidebar from "../components/Sidebar/Sidebar";
import ScrollToTopOnRefresh from "../components/ScrollToTopOnRefresh";
import MediaSessionCleanup from "../components/MediaSessionCleanup";
import SecurityShield from "../components/SecurityShield";
import { GET_INJECTABLE_UBLOCK_BUNDLE } from "../utils/javascriptInjector";
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
  title: "StreamNet",
  description: "A premium movie and TV streaming platform",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {/* Document-Start JavaScript Injector & Developer Security Shield */}
        <Script id="streamnet-security-shield" src="/security-shield.js" strategy="beforeInteractive" />
        <Script id="streamnet-js-injector" src="/api/injector.js" />
        <Script id="scroll-restoration" src="/scroll-restoration.js" />
      </head>
      <body className="min-h-full w-full flex flex-col bg-[var(--background)] overflow-x-hidden">
        <SecurityShield />
        <ScrollToTopOnRefresh />
        <MediaSessionCleanup />
        <AuthProvider>
          <Sidebar />
          <div className="main-content-wrapper">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
