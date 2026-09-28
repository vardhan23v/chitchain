import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { ContractBadge } from "@/components/ContractBadge";
import { ContractBanner } from "@/components/ContractBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "ChitChain — the pot sits in a contract",
  description: "Transparent chit funds on MST Blockchain. The pot sits in a contract, not in anyone's account.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4F46E5" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>
          <ContractBanner />
          <NavBar />
          <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:py-8">{children}</main>
          <Footer />
          <ContractBadge />
        </Providers>
      </body>
    </html>
  );
}
