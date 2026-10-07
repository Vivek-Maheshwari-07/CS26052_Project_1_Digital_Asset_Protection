import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BitGrid, hexTo64Bits } from "../components/ui/BitGrid";
import { getHeatmapCellColor } from "../pages/ResultsDashboardPage";
import { isSoundEnabled, setSoundEnabled } from "../utils/sound";

describe("Editorial Print-Studio Signature Components & Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("converts a 16-hex hash string into exactly 64 binary bits", () => {
    const hex = "f0a5000000000000"; // 16 hex chars
    const bits = hexTo64Bits(hex);
    expect(bits.length).toBe(64);
    // 'f' is 1111
    expect(bits.slice(0, 4)).toEqual([1, 1, 1, 1]);
    // '0' is 0000
    expect(bits.slice(4, 8)).toEqual([0, 0, 0, 0]);
    // 'a' is 1010
    expect(bits.slice(8, 12)).toEqual([1, 0, 1, 0]);
    // '5' is 0101
    expect(bits.slice(12, 16)).toEqual([0, 1, 0, 1]);
  });

  it("BitGrid renders 64 bit cells matching the hash bits", () => {
    const hex = "ffff000000000000";
    render(<BitGrid hashHex={hex} name="pHash" />);

    const cells = screen.getAllByTestId("bit-cell");
    expect(cells.length).toBe(64);

    // First 16 bits should be 1
    for (let i = 0; i < 16; i++) {
      expect(cells[i].getAttribute("data-bit")).toBe("1");
    }
    // Remaining 48 bits should be 0
    for (let i = 16; i < 64; i++) {
      expect(cells[i].getAttribute("data-bit")).toBe("0");
    }
  });

  it("Sound setting is off by default and persists correctly in localStorage", () => {
    expect(isSoundEnabled()).toBe(false);

    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
    expect(localStorage.getItem("provnet_sound")).toBe("on");

    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(localStorage.getItem("provnet_sound")).toBe("off");
  });

  it("Heatmap color function is monotonic with respect to recall", () => {
    const c0 = getHeatmapCellColor(0.0);
    const c25 = getHeatmapCellColor(0.25);
    const c50 = getHeatmapCellColor(0.5);
    const c75 = getHeatmapCellColor(0.75);
    const c100 = getHeatmapCellColor(1.0);

    // Darker cells switch text to light color
    expect(c0.text).toBe("var(--ink)");
    expect(c100.text).toBe("var(--paper)");

    // Alpha values increase monotonically
    const extractAlpha = (bg: string) => parseFloat(bg.match(/[\d.]+\)$/)?.[0] || "0");
    expect(extractAlpha(c0.bg)).toBeLessThan(extractAlpha(c25.bg));
    expect(extractAlpha(c25.bg)).toBeLessThan(extractAlpha(c50.bg));
    expect(extractAlpha(c50.bg)).toBeLessThan(extractAlpha(c75.bg));
    expect(extractAlpha(c75.bg)).toBeLessThan(extractAlpha(c100.bg));
  });
});
