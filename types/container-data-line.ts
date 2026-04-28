/**
 * [@BIS_CONT1] line row shape (UDO BIS_UDO_OCONT lines) as returned from the API / database.
 * Field names match the source columns (including U_size1 casing).
 * Required vs optional reflects the sample payloads; the database may still return null elsewhere.
 */
export type ContainerDataLine = {
  DocEntry: number;
  LineId: number;
  VisOrder: number;
  Object: string;
  LogInst: number | null;
  U_StatusDr: string;
  U_MBLNo: string;
  U_TOC: string;
  U_Vol: number;
  U_VolU: string | null;
  U_Weight: number;
  U_WUnit: string;
  U_PTOR: string;
  U_MinTemp: number;
  U_MaxTemp: number;
  U_HBLNo: string | null;
  U_SC: string | null;
  U_SCDate: string | null;
  U_CNo: string;
  U_CNStatus: string | null;
  U_size1: string;
  U_Load: string | null;
  U_Officer: string;
  U_IDF: string | null;
  U_Remarks: string;
  U_BDate: string | null;
  U_ADate: string | null;
  U_ContS: string | null;
  U_SealNo1: string;
  U_SealNo2: string;
  U_SealNo3: string;
  U_FrIn: string;
  U_NOP: string;
  U_NOPU: string;
  U_SCD: string | null;
  U_DelMode: string | null;
  U_IEmail: string;
  U_OEmail: string;
  U_CStatus: string;
  U_CStatus1: string | null;
  U_IN: string;
  U_OUT: string;
  U_SuppC: string | null;
  U_CNType: string;
  U_GID: string | null;
  U_GOD: string | null;
  U_SD: string | null;
  U_CPOD: string;
  U_COS: string;
  U_PV: string;
  U_ItemCode: string | null;
  U_ItemName: string | null;
  U_CONTSH: string;
};
