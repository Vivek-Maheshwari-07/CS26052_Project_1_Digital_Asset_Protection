import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BitGrid } from "../components/ui/BitGrid";
import { hexTo64Bits } from "../utils/bitGridHelper";
import { getHeatmapCellColor } from "../utils/heatmap";
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

  it("Heatmap text-colour function returns >= 4.5:1 contrast for 0, 0.5, and 1.0 in both Paper and Ink themes", () => {
    const testPoints = [0.0, 0.5, 1.0];
    const themes: ("paper" | "ink")[] = ["paper", "ink"];

    themes.forEach((theme) => {
      testPoints.forEach((recall) => {
        const { text, contrastRatio } = getHeatmapCellColor(recall, theme);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
        expect(text).toBeTruthy();
      });
    });
  });
});
