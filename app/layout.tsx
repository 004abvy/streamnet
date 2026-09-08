import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../context/AuthContext";
import ScrollToTopOnRefresh from "../components/ScrollToTopOnRefresh";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
              window.scrollTo(0, 0);
              if (document.body) document.body.scrollTop = 0;
              if (document.documentElement) document.documentElement.scrollTop = 0;
              window.addEventListener('beforeunload', function() { window.scrollTo(0, 0); });
              window.addEventListener('pagehide', function() { window.scrollTo(0, 0); });
            `,
          }}
        />
      </head>
      <body className="min-h-full w-full flex flex-col bg-[var(--background)] overflow-x-hidden">
        <ScrollToTopOnRefresh />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
