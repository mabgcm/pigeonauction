"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function SiteHeader() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-neutral-900">
            PigeonAuction
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/auctions" className="hover:text-neutral-900">
              Auctions
            </Link>
            <Link href="/profile" className="hover:text-neutral-900">
              Profile
            </Link>
            <Link href="/dev/seed" className="hover:text-neutral-900">
              Seed
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {loading ? (
            <span className="text-neutral-500">Loading...</span>
          ) : user ? (
            <>
              <span className="text-neutral-600">{user.displayName ?? user.email}</span>
              <button
                onClick={signOutUser}
                className="rounded-full border border-neutral-300 px-3 py-1 text-neutral-700 hover:border-neutral-400"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="rounded-full bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
