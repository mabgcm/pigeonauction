import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { requireDb } from "@/lib/db";
import type {
  BreedingPair,
  BreedingPairInput,
  LoftChick,
  LoftDiaryEntry,
  LoftEgg,
  LoftAuctionPrefill,
  LoftEntry,
  LoftPigeon,
  LoftPigeonFormInput,
  LoftReminder,
  PedigreeNode
} from "@/types/loft";

function normalizeRingNumber(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function isoNow() {
  return new Date().toISOString();
}

function toIsoDate(value: string) {
  if (!value) return "";
  return new Date(value).toISOString();
}

function addDays(base: string, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function listenToLoftEntries(userId: string, onChange: (entries: LoftEntry[]) => void): Unsubscribe {
  const db = requireDb();
  const entriesQuery = query(collection(db, "loft_entries"), where("user_id", "==", userId));
  return onSnapshot(entriesQuery, (snap) => {
    const rows = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LoftEntry, "id">)
    }));
    rows.sort((a, b) => {
      const aDate = new Date(a.updated_at ?? a.created_at).getTime();
      const bDate = new Date(b.updated_at ?? b.created_at).getTime();
      return bDate - aDate;
    });
    onChange(rows);
  });
}

export function listenToBreedingPairs(userId: string, onChange: (pairs: BreedingPair[]) => void): Unsubscribe {
  const db = requireDb();
  const pairsQuery = query(collection(db, "breeding_pairs"), where("user_id", "==", userId));
  return onSnapshot(pairsQuery, (snap) => {
    const rows = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<BreedingPair, "id">)
    }));
    rows.sort((a, b) => new Date(b.pairing_date).getTime() - new Date(a.pairing_date).getTime());
    onChange(rows);
  });
}

export function listenToEggs(userId: string, onChange: (eggs: LoftEgg[]) => void): Unsubscribe {
  const db = requireDb();
  const eggsQuery = query(collection(db, "eggs"), where("user_id", "==", userId));
  return onSnapshot(eggsQuery, (snap) => {
    const rows = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LoftEgg, "id">)
    }));
    rows.sort((a, b) => new Date(b.laid_at).getTime() - new Date(a.laid_at).getTime());
    onChange(rows);
  });
}

export function listenToChicks(userId: string, onChange: (chicks: LoftChick[]) => void): Unsubscribe {
  const db = requireDb();
  const chicksQuery = query(collection(db, "chicks"), where("user_id", "==", userId));
  return onSnapshot(chicksQuery, (snap) => {
    const rows = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LoftChick, "id">)
    }));
    rows.sort((a, b) => new Date(b.hatched_at).getTime() - new Date(a.hatched_at).getTime());
    onChange(rows);
  });
}

export function listenToDiaryEntries(userId: string, onChange: (entries: LoftDiaryEntry[]) => void): Unsubscribe {
  const db = requireDb();
  const diaryQuery = query(collection(db, "loft_diary"), where("user_id", "==", userId));
  return onSnapshot(diaryQuery, (snap) => {
    const rows = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<LoftDiaryEntry, "id">)
    }));
    rows.sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
    onChange(rows);
  });
}

export async function createLoftPigeon(userId: string, payload: LoftPigeonFormInput) {
  const db = requireDb();
  const now = isoNow();
  const pigeonRef = doc(collection(db, "pigeons"));
  const normalizedRing = normalizeRingNumber(payload.ring_number);

  const pigeonData: Omit<LoftPigeon, "id"> = {
    ring_number: normalizedRing,
    normalized_ring_number: normalizedRing.replace(/\s+/g, ""),
    name: payload.name?.trim() || null,
    sex: payload.sex,
    color: payload.color?.trim() || null,
    breeder: payload.breeder?.trim() || null,
    owner: payload.owner?.trim() || null,
    notes: payload.notes?.trim() || null,
    photo_url: payload.photo_url?.trim() || null,
    father_pigeon_id: null,
    mother_pigeon_id: null,
    created_at: now,
    updated_at: now
  };

  const entryData: Omit<LoftEntry, "id"> = {
    user_id: userId,
    pigeon_id: pigeonRef.id,
    ring_number: normalizedRing,
    name: payload.name?.trim() || "",
    sex: payload.sex,
    color: payload.color?.trim() || "",
    photo_url: payload.photo_url?.trim() || "",
    status: "active",
    categories: payload.categories?.filter(Boolean) ?? [],
    notes: payload.notes?.trim() || "",
    created_at: now,
    updated_at: now
  };

  await Promise.all([
    setDoc(pigeonRef, pigeonData),
    setDoc(doc(db, "loft_entries", pigeonRef.id), entryData)
  ]);

  return pigeonRef.id;
}

export async function updateLoftPigeon(
  userId: string,
  pigeonId: string,
  payload: Partial<LoftPigeonFormInput> & { status?: LoftEntry["status"] }
) {
  const db = requireDb();
  const now = isoNow();
  const pigeonRef = doc(db, "pigeons", pigeonId);
  const entryRef = doc(db, "loft_entries", pigeonId);
  const entrySnap = await getDoc(entryRef);
  if (!entrySnap.exists()) {
    throw new Error("Loft pigeon not found.");
  }

  const entry = entrySnap.data() as LoftEntry;
  if (entry.user_id !== userId) {
    throw new Error("You do not have access to update this loft pigeon.");
  }

  const pigeonUpdates: { [key: string]: unknown } = { updated_at: now };
  const entryUpdates: { [key: string]: unknown } = { updated_at: now };

  if (payload.ring_number !== undefined) {
    const normalizedRing = normalizeRingNumber(payload.ring_number);
    pigeonUpdates.ring_number = normalizedRing;
    pigeonUpdates.normalized_ring_number = normalizedRing.replace(/\s+/g, "");
    entryUpdates.ring_number = normalizedRing;
  }
  if (payload.name !== undefined) {
    pigeonUpdates.name = payload.name?.trim() || null;
    entryUpdates.name = payload.name?.trim() || "";
  }
  if (payload.sex !== undefined) {
    pigeonUpdates.sex = payload.sex;
    entryUpdates.sex = payload.sex;
  }
  if (payload.color !== undefined) {
    pigeonUpdates.color = payload.color?.trim() || null;
    entryUpdates.color = payload.color?.trim() || "";
  }
  if (payload.breeder !== undefined) pigeonUpdates.breeder = payload.breeder?.trim() || null;
  if (payload.owner !== undefined) pigeonUpdates.owner = payload.owner?.trim() || null;
  if (payload.notes !== undefined) {
    pigeonUpdates.notes = payload.notes?.trim() || null;
    entryUpdates.notes = payload.notes?.trim() || "";
  }
  if (payload.photo_url !== undefined) {
    pigeonUpdates.photo_url = payload.photo_url?.trim() || null;
    entryUpdates.photo_url = payload.photo_url?.trim() || "";
  }
  if (payload.categories !== undefined) {
    entryUpdates.categories = payload.categories.filter(Boolean);
  }
  if (payload.status !== undefined) {
    entryUpdates.status = payload.status;
  }

  await Promise.all([
    updateDoc(pigeonRef, pigeonUpdates as never),
    updateDoc(entryRef, entryUpdates as never)
  ]);
}

export async function getLoftPigeon(pigeonId: string) {
  const db = requireDb();
  const [pigeonSnap, entrySnap] = await Promise.all([
    getDoc(doc(db, "pigeons", pigeonId)),
    getDoc(doc(db, "loft_entries", pigeonId))
  ]);
  if (!pigeonSnap.exists() || !entrySnap.exists()) return null;
  return {
    pigeon: { id: pigeonSnap.id, ...(pigeonSnap.data() as Omit<LoftPigeon, "id">) },
    entry: { id: entrySnap.id, ...(entrySnap.data() as Omit<LoftEntry, "id">) }
  };
}

export async function getAuctionPrefillFromLoft(userId: string, pigeonId: string): Promise<LoftAuctionPrefill | null> {
  const db = requireDb();
  const loftData = await getLoftPigeon(pigeonId);
  if (!loftData || loftData.entry.user_id !== userId) {
    return null;
  }

  const { pigeon, entry } = loftData;
  const pedigreeSnap =
    pigeon.latest_pedigree_id
      ? await getDoc(doc(db, "pedigrees", pigeon.latest_pedigree_id))
      : null;

  const pedigreeData = pedigreeSnap?.exists()
    ? (pedigreeSnap.data() as {
        summary?: string;
        preview?: LoftAuctionPrefill["pedigreePreview"];
      })
    : null;

  const descriptionParts = [
    pigeon.notes,
    entry.categories.length > 0 ? `Categories: ${entry.categories.join(", ")}` : "",
    pigeon.color ? `Color: ${pigeon.color}` : "",
    pigeon.breeder ? `Breeder: ${pigeon.breeder}` : ""
  ].filter(Boolean);

  return {
    pigeonId,
    pigeonName: pigeon.name?.trim() || pigeon.ring_number,
    description: descriptionParts.join("\n"),
    photoUrls: pigeon.photo_url ? [pigeon.photo_url] : [],
    pedigreeInfo: pedigreeData?.summary || "",
    pedigreePreview: pedigreeData?.preview ?? null,
    pedigreePdfUrl: null,
    pedigreeSubjectId: pigeonId
  };
}

export async function getPedigreeNode(pigeonId: string): Promise<PedigreeNode | null> {
  const db = requireDb();
  const rootSnap = await getDoc(doc(db, "pigeons", pigeonId));
  if (!rootSnap.exists()) return null;
  const root = { id: rootSnap.id, ...(rootSnap.data() as Omit<LoftPigeon, "id">) };

  async function fetchPigeon(id?: string | null) {
    if (!id) return null;
    const snap = await getDoc(doc(db, "pigeons", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<LoftPigeon, "id">) };
  }

  const father = await fetchPigeon(root.father_pigeon_id);
  const mother = await fetchPigeon(root.mother_pigeon_id);
  const [paternalGrandfather, paternalGrandmother, maternalGrandfather, maternalGrandmother] =
    await Promise.all([
      fetchPigeon(father?.father_pigeon_id),
      fetchPigeon(father?.mother_pigeon_id),
      fetchPigeon(mother?.father_pigeon_id),
      fetchPigeon(mother?.mother_pigeon_id)
    ]);

  return {
    pigeon: root,
    father,
    mother,
    paternalGrandfather,
    paternalGrandmother,
    maternalGrandfather,
    maternalGrandmother
  };
}

export async function createBreedingPair(userId: string, payload: BreedingPairInput) {
  const db = requireDb();
  const [fatherSnap, motherSnap] = await Promise.all([
    getDoc(doc(db, "pigeons", payload.father_pigeon_id)),
    getDoc(doc(db, "pigeons", payload.mother_pigeon_id))
  ]);

  if (!fatherSnap.exists() || !motherSnap.exists()) {
    throw new Error("Selected pigeons could not be found.");
  }

  const father = fatherSnap.data() as LoftPigeon;
  const mother = motherSnap.data() as LoftPigeon;
  const now = isoNow();

  await addDoc(collection(db, "breeding_pairs"), {
    user_id: userId,
    father_pigeon_id: payload.father_pigeon_id,
    mother_pigeon_id: payload.mother_pigeon_id,
    father_ring_number: father.ring_number,
    mother_ring_number: mother.ring_number,
    father_name: father.name ?? "",
    mother_name: mother.name ?? "",
    pairing_date: toIsoDate(payload.pairing_date),
    note: payload.note?.trim() || "",
    eggs_count: 0,
    chicks_count: 0,
    status: "active",
    last_egg_at: null,
    expected_hatch_at: addDays(toIsoDate(payload.pairing_date), 18),
    created_at: now,
    updated_at: now
  });
}

export async function updateBreedingPair(pairId: string, payload: Partial<BreedingPairInput>) {
  const db = requireDb();
  const updates: { [key: string]: unknown } = { updated_at: isoNow() };
  if (payload.pairing_date !== undefined) {
    updates.pairing_date = toIsoDate(payload.pairing_date);
  }
  if (payload.note !== undefined) {
    updates.note = payload.note?.trim() || "";
  }
  await updateDoc(doc(db, "breeding_pairs", pairId), updates as never);
}

export async function deleteBreedingPair(pairId: string) {
  const db = requireDb();
  await setDoc(
    doc(db, "breeding_pairs", pairId),
    { status: "archived", updated_at: isoNow() },
    { merge: true }
  );
}

export async function recordEggForPair(pairId: string) {
  const db = requireDb();
  const pairRef = doc(db, "breeding_pairs", pairId);
  const snap = await getDoc(pairRef);
  if (!snap.exists()) {
    throw new Error("Breeding pair not found.");
  }
  const pair = snap.data() as BreedingPair;
  const laidAt = isoNow();
  const sequenceNumber = (pair.eggs_count || 0) + 1;
  await addDoc(collection(db, "eggs"), {
    user_id: pair.user_id,
    pair_id: pairId,
    sequence_number: sequenceNumber,
    laid_at: laidAt,
    expected_hatch_at: addDays(laidAt, 18),
    status: "incubating",
    note: "",
    created_at: laidAt,
    updated_at: laidAt
  });
  await updateDoc(pairRef, {
    eggs_count: sequenceNumber,
    last_egg_at: laidAt,
    expected_hatch_at: addDays(laidAt, 18),
    updated_at: laidAt
  });
}

export async function markEggAsHatched(eggId: string) {
  const db = requireDb();
  const eggRef = doc(db, "eggs", eggId);
  const eggSnap = await getDoc(eggRef);
  if (!eggSnap.exists()) {
    throw new Error("Egg not found.");
  }
  const egg = eggSnap.data() as LoftEgg;
  if (egg.status === "hatched") {
    return;
  }

  const hatchedAt = isoNow();
  await Promise.all([
    updateDoc(eggRef, {
      status: "hatched",
      updated_at: hatchedAt
    }),
    addDoc(collection(db, "chicks"), {
      user_id: egg.user_id,
      pair_id: egg.pair_id,
      egg_id: eggId,
      hatched_at: hatchedAt,
      note: "",
      created_at: hatchedAt,
      updated_at: hatchedAt
    })
  ]);

  const pairRef = doc(db, "breeding_pairs", egg.pair_id);
  const pairSnap = await getDoc(pairRef);
  if (pairSnap.exists()) {
    const pair = pairSnap.data() as BreedingPair;
    await updateDoc(pairRef, {
      chicks_count: (pair.chicks_count || 0) + 1,
      status: "hatched",
      updated_at: hatchedAt
    });
  }
}

export async function updateEggStatus(eggId: string, status: LoftEgg["status"]) {
  const db = requireDb();
  const eggRef = doc(db, "eggs", eggId);
  await updateDoc(eggRef, {
    status,
    updated_at: isoNow()
  });
}

export async function createDiaryEntry(userId: string, payload: { title: string; body: string; entry_date?: string }) {
  const db = requireDb();
  const now = isoNow();
  await addDoc(collection(db, "loft_diary"), {
    user_id: userId,
    title: payload.title.trim(),
    body: payload.body.trim(),
    entry_date: payload.entry_date ? toIsoDate(payload.entry_date) : now,
    created_at: now,
    updated_at: now
  });
}

export async function deleteDiaryEntry(entryId: string) {
  const db = requireDb();
  await updateDoc(doc(db, "loft_diary", entryId), {
    archived: true,
    updated_at: isoNow()
  } as never);
}

export function getLoftStats(entries: LoftEntry[]) {
  const activeEntries = entries.filter((entry) => entry.status === "active");
  const male = activeEntries.filter((entry) => entry.sex === "male").length;
  const female = activeEntries.filter((entry) => entry.sex === "female").length;
  const juvenile = activeEntries.filter((entry) =>
    entry.categories.some((category) => category.toLowerCase().includes("young") || category.toLowerCase().includes("juvenile"))
  ).length;

  const categoryMap = new Map<string, number>();
  activeEntries.forEach((entry) => {
    entry.categories.forEach((category) => {
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    });
  });

  return {
    total: activeEntries.length,
    male,
    female,
    juvenile,
    categories: Array.from(categoryMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  };
}

export function getUpcomingReminders(pairs: BreedingPair[], eggs: LoftEgg[]): LoftReminder[] {
  const eggReminders = eggs
    .filter((egg) => egg.status === "incubating")
    .map((egg): LoftReminder => {
      const pair = pairs.find((item) => item.id === egg.pair_id);
      return {
        id: egg.id,
        title: "Expected hatch window",
        subtitle: pair ? `${pair.father_ring_number} × ${pair.mother_ring_number}` : "Breeding pair",
        due_at: egg.expected_hatch_at,
        type: "hatch"
      };
    });

  const pairReminders = pairs
    .filter((pair) => pair.status !== "archived" && pair.eggs_count === 0)
    .map((pair): LoftReminder => ({
      id: pair.id,
      title: "Pairing follow-up",
      subtitle: `${pair.father_ring_number} × ${pair.mother_ring_number}`,
      due_at: pair.expected_hatch_at ?? pair.pairing_date,
      type: "pairing"
    }));

  return [...eggReminders, ...pairReminders]
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, 5);
}

export function buildBreedingMetrics(pairs: BreedingPair[], eggs: LoftEgg[], chicks: LoftChick[]) {
  const visiblePairs = pairs.filter((pair) => pair.status !== "archived");
  const visibleEggs = eggs.filter((egg) => visiblePairs.some((pair) => pair.id === egg.pair_id));
  const visibleChicks = chicks.filter((chick) => visiblePairs.some((pair) => pair.id === chick.pair_id));
  const hatchedEggs = visibleEggs.filter((egg) => egg.status === "hatched").length;
  const success = visibleEggs.length > 0 ? Math.round((hatchedEggs / visibleEggs.length) * 100) : 0;
  return {
    totalPairs: visiblePairs.length,
    eggs: visibleEggs.length,
    chicks: visibleChicks.length,
    success
  };
}

export async function getExistingCategories(userId: string) {
  const db = requireDb();
  const snap = await getDocs(query(collection(db, "loft_entries"), where("user_id", "==", userId)));
  const categories = new Set<string>();
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() as LoftEntry;
    data.categories.forEach((category) => categories.add(category));
  });
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}
