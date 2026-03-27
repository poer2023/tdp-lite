import type { Metadata, Viewport } from "next";
import { AppChrome } from "@/components/AppChrome";
import { PreviewDockProvider } from "@/components/bento/PreviewDockContext";
import { RouteTransitionProvider } from "@/components/route-transition/RouteTransitionProvider";
import "./globals.css";

const documentBootstrapScript = `
(() => {
  try {
    const pathname = window.location.pathname || "/";
    const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "zh";
    document.documentElement.lang = locale;

    const key = "tdp-theme-preference";
    const root = document.documentElement;
    const stored = window.localStorage.getItem(key);
    const isDark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
  } catch (_) {}
})();
`;

export const metadata: Metadata = {
  title: "TDP Lite",
  description: "A minimal blog platform",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#202833" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: documentBootstrapScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <PreviewDockProvider>
          <RouteTransitionProvider>
            {children}
            <AppChrome />
          </RouteTransitionProvider>
        </PreviewDockProvider>
      </body>
    </html>
  );
}
