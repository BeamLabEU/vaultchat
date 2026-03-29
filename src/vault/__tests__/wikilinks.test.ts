import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractWikilinks,
  resolveContextWikilinks,
  resolveInlineWikilinks,
} from "../wikilinks.ts";

describe("extractWikilinks", () => {
  test("extracts single wikilink", () => {
    expect(extractWikilinks("See [[My Note]] for details")).toEqual([
      "My Note",
    ]);
  });

  test("extracts multiple wikilinks", () => {
    expect(
      extractWikilinks("Check [[Note A]] and [[Note B]] for context")
    ).toEqual(["Note A", "Note B"]);
  });

  test("returns empty for no wikilinks", () => {
    expect(extractWikilinks("No links here")).toEqual([]);
  });
});

describe("resolveContextWikilinks", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "vaultchat-test-"));
    await Bun.write(
      join(tmpDir, "Server Infrastructure.md"),
      `---
title: Server Infrastructure
---

Primary server: Hetzner CAX41 ARM64
OS: Ubuntu 24.04
`
    );
    await Bun.write(
      join(tmpDir, "Docker Setup Notes.md"),
      "Running 108 containers across 3 servers.\n"
    );
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true });
  });

  test("resolves frontmatter context links", async () => {
    const result = await resolveContextWikilinks(
      ["[[Server Infrastructure]]"],
      tmpDir
    );
    expect(result).toContain("From [[Server Infrastructure]]");
    expect(result).toContain("Hetzner CAX41 ARM64");
  });

  test("strips frontmatter from resolved files", async () => {
    const result = await resolveContextWikilinks(
      ["[[Server Infrastructure]]"],
      tmpDir
    );
    expect(result).not.toContain("title:");
  });

  test("resolves files without frontmatter", async () => {
    const result = await resolveContextWikilinks(
      ["[[Docker Setup Notes]]"],
      tmpDir
    );
    expect(result).toContain("108 containers");
  });

  test("returns empty for non-existent links", async () => {
    const result = await resolveContextWikilinks(
      ["[[Nonexistent Note]]"],
      tmpDir
    );
    expect(result).toBe("");
  });
});

describe("resolveInlineWikilinks", () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "vaultchat-test-"));
    await Bun.write(
      join(tmpDir, "Payments.md"),
      "Payment module handles Stripe integration.\n"
    );
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true });
  });

  test("resolves inline wikilinks from message text", async () => {
    const result = await resolveInlineWikilinks(
      "Refactor the module in [[Payments]] to support LemonSqueezy",
      tmpDir
    );
    expect(result).toContain("Stripe integration");
  });

  test("returns empty when no wikilinks present", async () => {
    const result = await resolveInlineWikilinks(
      "Just a plain message",
      tmpDir
    );
    expect(result).toBe("");
  });
});
