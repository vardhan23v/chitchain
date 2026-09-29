import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { MobileTabs } from "@/components/shell/MobileTabs";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopHeader } from "@/components/shell/TopHeader";
import { Footer } from "@/components/Footer";
import { ContractBanner } from "@/components/ContractBanner";
import { CursorGlow } from "@/components/motion/CursorGlow";

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
        {/* Mirrors the stored animation preference onto <html> before the first paint so the CSS kill switch is right from frame one. */}
        <Script id="motion-pref" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: 'try{var m=localStorage.getItem("chitchain:motion");if(m==="on"||m==="off")document.documentElement.setAttribute("data-motion",m)}catch(e){}' }} />
        <Providers>
          <CursorGlow />
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
