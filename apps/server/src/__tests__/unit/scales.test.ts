import { describe, expect, it } from "bun:test";
import { validateScale } from "@/lib/scales";

describe("validateScale", () => {
  it("accepts a valid standard scale", () => {
    expect(validateScale(["1", "2", "3", "5", "8"])).toEqual({ valid: true });
  });

  it("accepts exactly 2 values (minimum boundary)", () => {
    expect(validateScale(["1", "2"])).toEqual({ valid: true });
  });

  it("accepts exactly 15 values (maximum boundary)", () => {
    const scale = Array.from({ length: 15 }, (_, i) => String(i + 1));
    expect(validateScale(scale)).toEqual({ valid: true });
  });

  it("rejects a scale with fewer than 2 values", () => {
    const result = validateScale(["1"]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/at least 2/);
  });

  it("rejects empty scale", () => {
    const result = validateScale([]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/at least 2/);
  });

  it("rejects a scale with more than 15 values", () => {
    const scale = Array.from({ length: 16 }, (_, i) => String(i + 1));
    const result = validateScale(scale);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/at most 15/);
  });

  it("rejects duplicate values", () => {
    const result = validateScale(["1", "2", "2", "5"]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/duplicates/);
  });

  it("rejects non-integer values (decimal)", () => {
    const result = validateScale(["1", "2.5", "5"]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/positive integers/);
  });

  it("rejects zero", () => {
    const result = validateScale(["0", "1", "2"]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/positive integers/);
  });

  it("rejects negative values", () => {
    const result = validateScale(["-1", "1", "2"]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/positive integers/);
  });

  it("rejects descending order", () => {
    const result = validateScale(["5", "3", "1"]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/ascending/);
  });

  it("rejects non-numeric strings", () => {
    const result = validateScale(["1", "two", "3"]);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/positive integers/);
  });
});
