import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopHeader } from "@/components/shell/TopHeader";
import { Footer } from "@/components/Footer";
import { ContractBanner } from "@/components/ContractBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ChitChain: chit funds, rebuilt on-chain", template: "%s · ChitChain" },
  description: "Transparent chit funds on MST Blockchain. The pot sits in a smart contract, not in anyone's account.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0D0F13" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <Providers>
          <ContractBanner />
          <Sidebar />
          <div className="md:pl-[72px] xl:pl-60">
            <TopHeader />
            <main className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8">{children}</main>
            <Footer />
          </div>
          <MobileTabs />
        </Providers>
      </body>
    </html>
  );
}
