import { createContext } from "react";
import type { VerifyResponse } from "../api/types";

export interface QueryImageContextType {
  queryFile: File | null;
  verifyResponse: VerifyResponse | null;
  setQueryData: (file: File | null, res: VerifyResponse | null) => void;
  clearQueryData: () => void;
}

export const QueryImageContext = createContext<QueryImageContextType | undefined>(undefined);
