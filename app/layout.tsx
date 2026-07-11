import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "AVEXA — Premium Websites. Smart Systems. Real Growth.",
  description:
    "AVEXA is an autonomous AI web agency that finds businesses without a website and builds them one — plus booking systems and dashboards — automatically.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-avexa-bg text-avexa-fg">
        {children}
      </body>
    </html>
  );
}
