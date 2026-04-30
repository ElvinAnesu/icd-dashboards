export type ServiceTypeBarRow = {
  itemCode: string;
  dscription: string;
  revenue: number;
};

export type ServiceTypeTrendSeries = {
  itemCode: string;
  dscription: string;
  data: number[];
};

export type ServiceTypeBarResponse = {
  mode: "bar";
  rows: ServiceTypeBarRow[];
};

export type ServiceTypeTrendResponse = {
  mode: "trend";
  labels: string[];
  series: ServiceTypeTrendSeries[];
};

export type ServiceTypeResponse = ServiceTypeBarResponse | ServiceTypeTrendResponse;
