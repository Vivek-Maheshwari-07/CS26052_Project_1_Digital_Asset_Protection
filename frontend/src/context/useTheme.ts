import { useContext } from "react";
import { ThemeContext } from "./ThemeContextDefinition";

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "light" as const, toggleTheme: () => {} };
  }
  return ctx;
}
