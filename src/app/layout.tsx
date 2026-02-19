import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { GlobalLocaleSwitch } from "@/components/GlobalLocaleSwitch";

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
    <html lang={lang}>
      <body className="min-h-screen antialiased">
        <GlobalLocaleSwitch />
        {children}
      </body>
    </html>
  );
}
