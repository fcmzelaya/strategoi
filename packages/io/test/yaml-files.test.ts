import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Envelope } from "@strategoi/config";
import { ConfigError, YamlFileStore } from "../src/index.js";

const pipeline: Envelope = {
  kind: "Pipeline",
  id: "text-to-svg",
  version: 1,
  label: "Text to SVG",
  spec: { steps: ["sources.text", "transforms.tokenizer", "sinks.svg"] },
};

// Each test gets its own empty folder, deleted afterwards.
let root: string;
let store: YamlFileStore;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "strategoi-io-"));
  store = new YamlFileStore(root);
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("YamlFileStore", () => {
  it("saves a config and loads it back unchanged", async () => {
    await store.save(pipeline);
    expect(await store.load({ kind: "Pipeline", id: "text-to-svg" })).toEqual(pipeline);
  });

  it("writes one readable YAML file per config", async () => {
    await store.save(pipeline);
    const text = await readFile(join(root, "Pipeline", "text-to-svg.yaml"), "utf8");
    expect(text).toContain("kind: Pipeline");
    expect(text).toContain("- sources.text");
  });

  it("returns undefined for a config that doesn't exist", async () => {
    expect(await store.load({ kind: "Pipeline", id: "missing" })).toBeUndefined();
  });

  it("lists what it holds, by kind", async () => {
    await store.save(pipeline);
    await store.save({ ...pipeline, id: "another" });
    expect(await store.list("Pipeline")).toEqual([
      { kind: "Pipeline", id: "another" },
      { kind: "Pipeline", id: "text-to-svg" },
    ]);
    expect(await store.list("Workflow")).toEqual([]);
  });

  it("refuses to save an invalid config and writes nothing", async () => {
    const broken = { ...pipeline, spec: { steps: ["tokenizer"] } };
    await expect(store.save(broken)).rejects.toThrow(ConfigError);
    expect(await store.list()).toEqual([]);
  });

  it("fails loudly on a hand-edited broken file", async () => {
    await mkdir(join(root, "Pipeline"));
    await writeFile(join(root, "Pipeline", "edited.yaml"), "kind: Pipeline\nid: edited\nspec: {}\n");
    await expect(store.load({ kind: "Pipeline", id: "edited" })).rejects.toThrow(/required property 'version'/);
  });

  it("rejects a reference that would leave its folder", async () => {
    await expect(store.load({ kind: "Pipeline", id: "../../secrets" })).rejects.toThrow(ConfigError);
  });
});
