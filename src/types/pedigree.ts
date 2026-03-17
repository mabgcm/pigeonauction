export type PedigreeSex = "male" | "female" | "unknown";

export type PedigreeSlot =
  | "subject"
  | "father"
  | "mother"
  | "paternal_grandsire"
  | "paternal_granddam"
  | "maternal_grandsire"
  | "maternal_granddam";

export type PedigreeJobStatus = "idle" | "processing" | "completed" | "failed";

export interface PedigreeBirdSummary {
  pigeon_id?: string | null;
  ring_number?: string | null;
  name?: string | null;
  sex?: PedigreeSex;
  color?: string | null;
  breeder?: string | null;
  owner?: string | null;
  notes?: string | null;
}

export interface PedigreePreview {
  confidence: number;
  source_language?: string | null;
  notes: string[];
  subject: PedigreeBirdSummary;
  father?: PedigreeBirdSummary | null;
  mother?: PedigreeBirdSummary | null;
}

export interface ProcessPedigreeRequest {
  target: "auction" | "loft";
  auctionId?: string;
  storagePath: string;
  sourceUrl: string;
  fileName: string;
  contentType: string;
  pigeonName: string;
}

export interface ProcessPedigreeResponse {
  jobId: string;
  pedigreeId: string;
  subjectPigeonId: string;
  loftEntryId?: string | null;
  pdfUrl: string;
  preview: PedigreePreview;
  summary: string;
}
