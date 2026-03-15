"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getUserProfile } from "@/lib/users";

type Tab = {
  href: string;
  label: string;
};

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const profile = await getUserProfile(user.uid);
      if (!active) return;
      setIsAdmin(profile?.role === "admin");
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  const tabs: Tab[] = [
    { href: "/auctions", label: "Auctions" },
    { href: "/auctions/new", label: "Sell" },
    { href: "/profile", label: "Profile" }
  ];

  if (isAdmin) {
    tabs.push({ href: "/admin", label: "Admin" });
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
                className={`h-1.5 w-1.5 rounded-full ${
                  active ? "bg-neutral-900" : "bg-neutral-300"
                }`}
              />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
