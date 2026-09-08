import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
        <meta
          httpEquiv="Content-Security-Policy"
          content="form-action 'self'; object-src 'none'; frame-src 'self' blob: data: https://*.nxsha.app https://*.cinesrc.st https://*.vidrock.ru https://*.vidsrc.in https://*.vidcore.org https://*.vsembed.ru https://*.vidsrcme.ru https://*.vidfast.vc https://*.vidsrc.io https://*.multiembed.mov https://*.2embed.cc https://www.youtube.com https://*.youtube.com;"
        />
        <Script
          id="streamnet-persistent-popup-shield"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Permanently lock down window.open on top window
                try {
                  Object.defineProperty(window, 'open', {
                    value: function() {
                      console.warn('[StreamNet Shield] Blocked popup attempt');
                      return null;
                    },
                    writable: false,
                    configurable: false
                  });
                } catch(e) {
                  window.open = function() { return null; };
                }

                // 2. Permanently block synthetic clicks on target="_blank" links
                if (typeof HTMLAnchorElement !== 'undefined') {
                  var origClick = HTMLAnchorElement.prototype.click;
                  HTMLAnchorElement.prototype.click = function() {
                    var target = this.getAttribute('target');
                    var href = this.getAttribute('href') || '';
                    if (target === '_blank' || (href && !href.startsWith('/') && !href.startsWith('#') && !href.includes(window.location.host) && !href.startsWith('javascript:'))) {
                      console.warn('[StreamNet Shield] Blocked synthetic link click:', href);
                      return;
                    }
                    return origClick.apply(this);
                  };
                }

                // 3. Permanently block form submit popups (<form target="_blank">)
                if (typeof HTMLFormElement !== 'undefined') {
                  var origFormSubmit = HTMLFormElement.prototype.submit;
                  HTMLFormElement.prototype.submit = function() {
                    var target = this.getAttribute('target');
                    if (target === '_blank' || target === '_top' || target === '_parent') {
                      console.warn('[StreamNet Shield] Blocked form popup submit:', this.action);
                      return;
                    }
                    return origFormSubmit.apply(this);
                  };
                }

                // 4. Capture-phase click listener to drop unauthorized popup/external link taps
                document.addEventListener('click', function(e) {
                  var el = e.target;
                  while (el && el !== document) {
                    if (el.tagName === 'A') {
                      var href = el.getAttribute('href') || '';
                      var target = el.getAttribute('target');
                      var isInternal = href.startsWith('/') || href.startsWith('#') || href.includes(window.location.host) || href.startsWith('javascript:');
                      if (target === '_blank' && !isInternal && !el.hasAttribute('data-allow-popup')) {
                        console.warn('[StreamNet Shield] Blocked rogue external link click:', href);
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                      }
                    }
                    el = el.parentElement;
                  }
                }, true);

                // 5. Anti-focus theft defense
                window.addEventListener('blur', function() {
                  setTimeout(function() {
                    try { window.focus(); } catch(err) {}
                  }, 10);
                });
              })();
            `,
          }}
        />
        <Script
          id="scroll-restoration"
          strategy="beforeInteractive"
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
