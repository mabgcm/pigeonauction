import "@/styles/globals.css";
import type { ReactNode } from "react";
import Providers from "@/components/Providers";
import SiteHeader from "@/components/SiteHeader";
import MobileTabBar from "@/components/MobileTabBar";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"]
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"]
});

export const metadata = {
  title: "PigeonBid.ca – Canada Racing Pigeon Auctions",
  description:
    "Verified buyers & sellers • Zero buyer fees • 100% Guarantee for Premium members • Low tiered seller commissions"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${spaceGrotesk.variable}`}>
        <Providers>
          <SiteHeader />
          <div className="min-h-[100svh] pb-24 md:pb-0">{children}</div>
          <MobileTabBar />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
