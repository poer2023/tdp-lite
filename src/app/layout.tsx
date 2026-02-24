import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const themeBootstrapScript = `
(() => {
  try {
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const lang = requestHeaders.get("x-tdp-locale") === "en" ? "en" : "zh";

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
