import type { Metadata } from "next";
import { AuthBoundary } from "@/components/auth/AuthBoundary";
import "./globals.css";
import "./alpha3.css";

export const metadata: Metadata = {
  title: "CopyPasteLearn OS — Build real skills",
  description: "An AI-native technical learning command center built around missions, evidence and real execution.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  return <html lang="en"><body><AuthBoundary enabled={authEnabled}>{children}</AuthBoundary></body></html>;
}
