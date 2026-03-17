export type LoftPigeonStatus = "active" | "archived";

export type LoftPigeonSex = "male" | "female" | "unknown";

export interface LoftEntry {
  id: string;
  user_id: string;
  pigeon_id: string;
  ring_number: string;
  name?: string;
  sex: LoftPigeonSex;
  color?: string;
  photo_url?: string;
  status: LoftPigeonStatus;
  categories: string[];
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface LoftPigeon {
  id: string;
  ring_number: string;
  normalized_ring_number?: string | null;
  name?: string | null;
  sex: LoftPigeonSex;
  color?: string | null;
  breeder?: string | null;
  owner?: string | null;
  notes?: string | null;
  photo_url?: string | null;
  father_pigeon_id?: string | null;
  mother_pigeon_id?: string | null;
  latest_pedigree_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LoftAuctionPrefill {
  pigeonId: string;
  pigeonName: string;
  description: string;
  photoUrls: string[];
  pedigreeInfo: string;
  pedigreePreview?: {
    confidence: number;
    source_language?: string | null;
    notes: string[];
    subject: {
      pigeon_id?: string | null;
      ring_number?: string | null;
      name?: string | null;
      sex?: "male" | "female" | "unknown";
      color?: string | null;
      breeder?: string | null;
      owner?: string | null;
      notes?: string | null;
    };
    father?: {
      pigeon_id?: string | null;
      ring_number?: string | null;
      name?: string | null;
      sex?: "male" | "female" | "unknown";
      color?: string | null;
      breeder?: string | null;
      owner?: string | null;
      notes?: string | null;
    } | null;
    mother?: {
      pigeon_id?: string | null;
      ring_number?: string | null;
      name?: string | null;
      sex?: "male" | "female" | "unknown";
      color?: string | null;
      breeder?: string | null;
      owner?: string | null;
      notes?: string | null;
    } | null;
  } | null;
  pedigreePdfUrl?: string | null;
  pedigreeSubjectId?: string | null;
}

export interface LoftReminder {
  id: string;
  title: string;
  subtitle: string;
  due_at: string;
  type: "pairing" | "egg" | "hatch" | "diary";
}

export interface BreedingPair {
  id: string;
  user_id: string;
  father_pigeon_id: string;
  mother_pigeon_id: string;
  father_ring_number: string;
  mother_ring_number: string;
  father_name?: string;
  mother_name?: string;
  pairing_date: string;
  note?: string;
  eggs_count: number;
  chicks_count: number;
  status: "active" | "hatched" | "archived";
  last_egg_at?: string | null;
  expected_hatch_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export type EggStatus = "incubating" | "hatched" | "clear" | "lost";

export interface LoftEgg {
  id: string;
  user_id: string;
  pair_id: string;
  sequence_number: number;
  laid_at: string;
  expected_hatch_at: string;
  status: EggStatus;
  note?: string;
  created_at: string;
  updated_at?: string;
}

export interface LoftChick {
  id: string;
  user_id: string;
  pair_id: string;
  egg_id: string;
  hatched_at: string;
  note?: string;
  created_at: string;
  updated_at?: string;
}

export interface LoftDiaryEntry {
  id: string;
  user_id: string;
  title: string;
  body: string;
  entry_date: string;
  created_at: string;
  updated_at?: string;
}

export interface LoftPigeonFormInput {
  ring_number: string;
  name?: string;
  sex: LoftPigeonSex;
  color?: string;
  breeder?: string;
  owner?: string;
  notes?: string;
  photo_url?: string;
  categories?: string[];
}

export interface BreedingPairInput {
  father_pigeon_id: string;
  mother_pigeon_id: string;
  pairing_date: string;
  note?: string;
}

export interface PedigreeNode {
  pigeon: LoftPigeon | null;
  father: LoftPigeon | null;
  mother: LoftPigeon | null;
  paternalGrandfather: LoftPigeon | null;
  paternalGrandmother: LoftPigeon | null;
  maternalGrandfather: LoftPigeon | null;
  maternalGrandmother: LoftPigeon | null;
}
