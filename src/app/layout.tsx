import "@/styles/globals.css";
import type { ReactNode } from "react";
import Providers from "@/components/Providers";
import SiteHeader from "@/components/SiteHeader";
import MobileTabBar from "@/components/MobileTabBar";
import { Fraunces, Space_Grotesk } from "next/font/google";

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
  title: "Pigeon Auction",
  description: "Realtime pigeon auction platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${spaceGrotesk.variable}`}>
        <Providers>
          <SiteHeader />
          <div className="min-h-[100svh] pb-24 md:pb-0">{children}</div>
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
