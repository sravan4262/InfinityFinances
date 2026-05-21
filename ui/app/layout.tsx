import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// Apple sign-in temporarily disabled — see docs/auth-otp-only.md.
// import Script from "next/script";
import "./globals.css";
import { ApiErrorModal } from "@/components/shared/ApiErrorModal";
import { ChatLauncher } from "@/components/features/chat/ChatLauncher";
import { AuthStateSync } from "@/components/layout/AuthStateSync";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Infinity Finances — Plan Your Early Retirement",
  description:
    "A beautiful, intelligent FIRE (Financial Independence, Retire Early) calculator. Use the form wizard or chat with AI to plan your path to financial freedom.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash: apply saved theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='light'){d.classList.remove('dark');}else{d.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthStateSync />
        {children}
        <ApiErrorModal />
        <ChatLauncher />
        {/*
          Apple sign-in temporarily disabled — see docs/auth-otp-only.md.
          <Script
            src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        */}
      </body>
    </html>
  );
}
