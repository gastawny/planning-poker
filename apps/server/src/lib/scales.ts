export const SCALE_PRESETS = {
  short: ["1", "2", "3", "5", "8"],
  standard: ["1", "2", "3", "5", "8", "13", "21"],
  long: ["1", "2", "3", "5", "8", "13", "21", "34", "55", "89"],
} as const;

export const DEFAULT_SCALE: string[] = [...SCALE_PRESETS.standard];
export const DEFAULT_SPECIAL_CARDS = ["?", "∞"];
export const VALID_SPECIAL_CARDS = ["?", "∞", "☕"];

type ValidationResult = { valid: true } | { valid: false; error: string };

export function validateScale(scale: string[]): ValidationResult {
  if (scale.length < 2) {
    return { valid: false, error: "Scale must have at least 2 values" };
  }
  if (scale.length > 15) {
    return { valid: false, error: "Scale must have at most 15 values" };
  }

  const nums: number[] = [];
  for (const value of scale) {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) {
      return { valid: false, error: "All scale values must be positive integers" };
    }
    nums.push(n);
  }

  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) {
      return { valid: false, error: "Scale values must not contain duplicates" };
    }
    seen.add(n);
  }

  for (let i = 1; i < nums.length; i++) {
    const curr = nums[i] as number;
    const prev = nums[i - 1] as number;
    if (curr <= prev) {
      return { valid: false, error: "Scale values must be in ascending order" };
    }
  }

  return { valid: true };
}
