import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DigitalOrbit — Websites & Digital Services",
    template: "%s | DigitalOrbit",
  },
  description:
    "DigitalOrbit designs and builds modern websites, brands, and apps for small and medium businesses — web design, branding, SEO, digital marketing, and app development.",
  keywords: [
    "web design agency",
    "website development",
    "branding",
    "SEO",
    "digital marketing",
    "app development",
  ],
  openGraph: {
    title: "DigitalOrbit — Websites & Digital Services",
    description:
      "Launch your business into the digital space. Modern websites, branding, SEO, marketing, and apps — without enterprise pricing.",
    type: "website",
    siteName: "DigitalOrbit",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
