import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { SideRail } from "@/components/shell/SideRail";
import { TopStrip } from "@/components/shell/TopStrip";
import { Footer } from "@/components/Footer";
import { ContractBadge } from "@/components/ContractBadge";
import { ContractBanner } from "@/components/ContractBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "ChitChain: the pot sits in a contract",
  description: "Transparent chit funds on MST Blockchain. The pot sits in a contract, not in anyone's account.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2E4A7D" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>
          <ContractBanner />
          <SideRail />
          <div className="md:pl-[104px]">
            <TopStrip />
            <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8">{children}</main>
            <Footer />
          </div>
          <MobileTabs />
          <ContractBadge />
        </Providers>
      </body>
    </html>
  );
}
