import { useState, type ReactNode } from "react";
import type { VerifyResponse } from "../api/types";
import { QueryImageContext } from "./QueryImageContextDefinition";

export function QueryImageProvider({ children }: { children: ReactNode }) {
  const [queryFile, setQueryFile] = useState<File | null>(null);
  const [verifyResponse, setVerifyResponse] = useState<VerifyResponse | null>(null);

  const setQueryData = (file: File | null, res: VerifyResponse | null) => {
    setQueryFile(file);
    setVerifyResponse(res);
  };

  const clearQueryData = () => {
    setQueryFile(null);
    setVerifyResponse(null);
  };

  return (
    <QueryImageContext.Provider
      value={{ queryFile, verifyResponse, setQueryData, clearQueryData }}
    >
      {children}
    </QueryImageContext.Provider>
  );
}
