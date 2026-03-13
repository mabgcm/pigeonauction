import ProfileForm from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">Profile</p>
        <h1 className="text-3xl font-semibold text-neutral-900">Your account</h1>
        <p className="text-neutral-600">Manage your display name for auctions and bids.</p>
      </header>
      <ProfileForm />
    </main>
  );
}
