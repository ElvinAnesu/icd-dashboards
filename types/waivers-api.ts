export type WaiversSummaryRow = {
  waiverReason: string;
  timesGiven: number;
  totalWaivedAmount: number;
};

export type WaiversResponse = {
  rows: WaiversSummaryRow[];
};
