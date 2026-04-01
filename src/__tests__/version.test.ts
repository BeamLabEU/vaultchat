import { describe, test, expect } from "bun:test";
import { compareSemver, getVersion, getRepoUrl } from "../version.ts";

describe("getVersion", () => {
  test("returns a semver string", () => {
    expect(getVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("getRepoUrl", () => {
  test("returns a GitHub URL", () => {
    expect(getRepoUrl()).toMatch(/^https:\/\/github\.com\/.+\/.+$/);
  });
});

describe("compareSemver", () => {
  test("equal versions return 0", () => {
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });

  test("strips v prefix", () => {
    expect(compareSemver("v1.0.0", "1.0.0")).toBe(0);
  });

  test("higher major returns 1", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBe(1);
  });

  test("lower major returns -1", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
  });

  test("higher minor returns 1", () => {
    expect(compareSemver("1.2.0", "1.1.0")).toBe(1);
  });

  test("higher patch returns 1", () => {
    expect(compareSemver("1.0.3", "1.0.2")).toBe(1);
  });

  test("complex comparison", () => {
    expect(compareSemver("0.2.0", "0.1.0")).toBe(1);
    expect(compareSemver("0.1.0", "0.2.0")).toBe(-1);
    expect(compareSemver("v0.10.0", "v0.9.0")).toBe(1);
  });
});
