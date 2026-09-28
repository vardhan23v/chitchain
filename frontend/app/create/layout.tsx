import type { Metadata } from "next";

export const metadata: Metadata = { title: "Create a circle" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
