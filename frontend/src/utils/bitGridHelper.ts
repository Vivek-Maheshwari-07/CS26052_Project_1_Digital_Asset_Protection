/**
 * Perceptual Hash bit manipulation helpers.
 */

// Convert 16 hex char string to 64 binary bits (0 or 1)
export function hexTo64Bits(hexStr: string): number[] {
  // Strip any leading 0x
  const cleanHex = hexStr.replace(/^0x/i, "").toLowerCase();
  const bits: number[] = [];

  for (let i = 0; i < cleanHex.length; i++) {
    const val = parseInt(cleanHex[i], 16);
    if (isNaN(val)) continue;
    // 4 bits per hex character
    bits.push((val >> 3) & 1);
    bits.push((val >> 2) & 1);
    bits.push((val >> 1) & 1);
    bits.push(val & 1);
  }

  // Ensure 64 bits
  while (bits.length < 64) {
    bits.push(0);
  }
  return bits.slice(0, 64);
}
