/**
 * Heatmap and Chart Visualization Utilities.
 * Provides WCAG AA luminance-compliant color scales and unified method configs.
 */

export interface MethodConfig {
  key: string;
  name: string;
  color: string;
  strokeDasharray?: string;
  strokeWidth?: number;
  isDeep?: boolean;
  isCascade?: boolean;
}

export const BASE_METHODS = [
  "phash",
  "dhash",
  "ahash",
  "whash",
  "clip",
  "dino",
] as const;

export const CHART_METHODS: MethodConfig[] = [
  {
    key: "phash",
    name: "pHash",
    color: "var(--ink)",
    strokeDasharray: "0", // solid
    strokeWidth: 2,
  },
  {
    key: "dhash",
    name: "dHash",
    color: "var(--cobalt)",
    strokeDasharray: "4 3", // dashed
    strokeWidth: 2,
  },
  {
    key: "ahash",
    name: "aHash",
    color: "var(--ink-soft)",
    strokeDasharray: "2 2", // dotted
    strokeWidth: 2,
  },
  {
    key: "whash",
    name: "wHash",
    color: "var(--cobalt)",
    strokeDasharray: "6 2 2 2", // dash-dot
    strokeWidth: 2,
  },
  {
    key: "clip",
    name: "CLIP ViT-B/32",
    color: "var(--ochre-text)",
    strokeDasharray: "0", // solid
    strokeWidth: 2,
    isDeep: true,
  },
  {
    key: "dino",
    name: "DINOv2-Base",
    color: "var(--vermilion)",
    strokeDasharray: "0", // solid
    strokeWidth: 2,
    isDeep: true,
  },
  {
    key: "cascade",
    name: "ProvNet Cascade",
    color: "var(--ink)",
    strokeDasharray: "5 5", // dashed ink
    strokeWidth: 2.5,
    isCascade: true,
  },
];

/**
 * Single-hue sequential scale function from --paper-2 (0%) to --cobalt (100%).
 * Computes WCAG relative luminance per cell to pick high-contrast black or white text (>= 4.5:1).
 */
export function getHeatmapCellColor(
  recall: number,
  theme: "paper" | "ink" = "paper"
): { bg: string; text: string; contrastRatio: number } {
  const clamped = Math.max(0, Math.min(1, isNaN(recall) ? 0 : recall));

  const isInk = theme === "ink";
  const startR = isInk ? 24 : 237;
  const startG = isInk ? 32 : 228;
  const startB = isInk ? 66 : 211;

  const endR = isInk ? 91 : 35;
  const endG = isInk ? 127 : 80;
  const endB = isInk ? 255 : 216;

  const r = Math.round(startR + clamped * (endR - startR));
  const g = Math.round(startG + clamped * (endG - startG));
  const b = Math.round(startB + clamped * (endB - startB));

  const bg = `rgb(${r}, ${g}, ${b})`;

  // WCAG relative luminance calculation
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Contrast with pure white (L=1.0) and dark ink (L=0.01)
  const contrastWhite = (1.0 + 0.05) / (L + 0.05);
  const contrastBlack = (L + 0.05) / (0.0 + 0.05);

  let text: string;
  let contrastRatio: number;

  if (contrastWhite >= contrastBlack) {
    text = "var(--paper)";
    contrastRatio = contrastWhite;
  } else {
    text = "var(--ink)";
    contrastRatio = contrastBlack;
  }

  return { bg, text, contrastRatio };
}
