import { getDb } from "@/lib/firestore";
import type { Firestore } from "firebase/firestore";

export function requireDb(): Firestore {
  const db = getDb();
  if (!db) {
    throw new Error("Firestore is not available on the server");
  }
  return db;
}
