import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organizer" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
