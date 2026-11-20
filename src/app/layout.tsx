import type { Metadata } from "next";
import { Outfit, Inter, Space_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/auth-provider";
import { LoginResultToast } from "@/components/auth/login-result-toast";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Scoped accent — used for the discovery-row mood tabs only (see discovery-row.tsx).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Serif accent — scoped to the hero headline/wordmark moment only (docs/research/refs/onefinestay-nav-dna.json).
// Everything functional (nav, body, UI copy) stays on Outfit/Inter.
// Instrument Serif only ships a single 400 weight (both styles) — no bold cut available.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Zennly",
  description: "Zennly",
  // The same mark zennly.io already uses — copied from web-zenly's own favicon.png via the
  // mirrored site, so the marketing site and the marketplace show one icon rather than two.
  // (public/businesses/ is a gitignored build artefact, so the file is copied into public/ to be
  // tracked rather than referenced where it sits.)
  //
  // Declared explicitly instead of relying on the browser's bare /favicon.ico request: that
  // request would otherwise be answered by src/app/favicon.ico, which is a different, older mark.
  // The .ico stays listed as a fallback for browsers that ignore a PNG icon.
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "400x400" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${inter.variable} ${spaceMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <LoginResultToast />
        {/* Top-right, below the nav. */}
        <Toaster position="top-right" richColors offset={{ top: 80, right: 24 }} mobileOffset={{ top: 72, left: 16, right: 16 }} />
      </body>
    </html>
  );
}
