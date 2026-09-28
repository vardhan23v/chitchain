import type { Metadata } from "next";

export const metadata: Metadata = { title: "Circle analytics" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
