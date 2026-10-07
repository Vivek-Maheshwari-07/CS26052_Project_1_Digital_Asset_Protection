import { useContext } from "react";
import { QueryImageContext } from "./QueryImageContextDefinition";

export function useQueryImage() {
  const ctx = useContext(QueryImageContext);
  if (!ctx) {
    throw new Error("useQueryImage must be used within a QueryImageProvider");
  }
  return ctx;
}
