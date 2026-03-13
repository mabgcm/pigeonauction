import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { requireDb } from "@/lib/db";
import type { UserProfile } from "@/types/auction";

export async function upsertUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
}) {
  const db = requireDb();
  const ref = doc(db, "users", user.uid);
  const payload: Partial<UserProfile> = {
    id: user.uid,
    email: user.email ?? "",
    name: user.displayName ?? "",
    role: "buyer",
    verification_status: "pending",
    created_at: new Date().toISOString()
  };

  await setDoc(
    ref,
    {
      ...payload,
      updated_at: serverTimestamp()
    },
    { merge: true }
  );
}

export async function getUserProfile(userId: string) {
  const db = requireDb();
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) } as UserProfile;
}

export async function updateUserProfileName(userId: string, name: string) {
  const db = requireDb();
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { name, updated_at: serverTimestamp() });
}
