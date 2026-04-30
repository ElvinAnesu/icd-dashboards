export type AgingBucketLabel = "0-30" | "31-60" | "61-90" | "90+";

export type ArAgingDetailRow = {
  cardCode: string;
  cardName: string;
  agingBucket: string;
  balanceDue: number;
};

export type ArAgingResponse = {
  rows: ArAgingDetailRow[];
  /** Max customers returned (by total outstanding balance). */
  top: number;
};
