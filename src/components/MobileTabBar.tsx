"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile } from "@/lib/users";
import type { VerificationStatus } from "@/types/auction";

type Tab = {
  href: string;
  label: string;
  icon: "home" | "auctions" | "sell" | "loft" | "profile" | "admin";
};

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user) {
        setIsAdmin(false);
        setVerificationStatus(null);
        return;
      }
      const profile = await getUserProfile(user.uid);
      if (!active) return;
      setIsAdmin(profile?.role === "admin");
      setVerificationStatus(profile?.verification_status ?? null);
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  const tabs: Tab[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/auctions", label: "Auctions", icon: "auctions" },
    { href: "/auctions/new", label: "Sell", icon: "sell" }
  ];

  if (verificationStatus === "approved") {
    tabs.splice(2, 0, { href: "/loft", label: "Loft", icon: "loft" });
  }

  if (isAdmin) {
    tabs.push({ href: "/admin", label: "Admin", icon: "admin" });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 text-xs font-semibold ${
                active ? "text-neutral-900" : "text-neutral-500"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                  active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {tab.icon === "home" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-6v-6H10v6H4a1 1 0 0 1-1-1v-10.5Z" />
                  </svg>
                )}
                {tab.icon === "auctions" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="14" rx="2" />
                    <path d="M7 8h10M7 12h6" />
                  </svg>
                )}
                {tab.icon === "sell" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
                {tab.icon === "loft" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="4" width="7" height="7" rx="1.5" />
                    <rect x="13" y="4" width="7" height="7" rx="1.5" />
                    <rect x="4" y="13" width="7" height="7" rx="1.5" />
                    <rect x="13" y="13" width="7" height="7" rx="1.5" />
                  </svg>
                )}
                {tab.icon === "profile" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                )}
                {tab.icon === "admin" && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2 3 6v6c0 5 4 9 9 10 5-1 9-5 9-10V6l-9-4Z" />
                    <path d="M9 12h6" />
                  </svg>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
