import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { refErrors, validateConfig, type Envelope } from "@strategoi/config";
import { ConfigError, type ConfigRef, type Sink, type Source } from "./types.js";

// Keeps configs as YAML files, one per config: <root>/<kind>/<id>.yaml.
// It's both a Source and a Sink, and it validates in both directions, so a
// broken config can't be saved and a hand-edited broken file fails loudly.
export class YamlFileStore implements Source, Sink {
  constructor(private readonly root: string) {}

  async load(ref: ConfigRef): Promise<Envelope | undefined> {
    let text: string;
    try {
      // `await` pauses this function until the file is read. Node runs other
      // work (other requests, timers) in the meantime.
      text = await readFile(this.path(ref), "utf8");
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
    const result = validateConfig(parse(text));
    if (!result.ok) throw new ConfigError(`${this.path(ref)} is not a valid config:`, result.errors);
    return result.config;
  }

  async save(config: Envelope): Promise<void> {
    const result = validateConfig(config);
    if (!result.ok) throw new ConfigError(`${config.kind}/${config.id} was not saved:`, result.errors);
    await mkdir(join(this.root, config.kind), { recursive: true });
    await writeFile(this.path(config), stringify(config), "utf8");
  }

  async list(kind?: string): Promise<ConfigRef[]> {
    const kinds = kind ? [kind] : await this.folders();
    const refs: ConfigRef[] = [];
    for (const k of kinds) {
      for (const file of await this.files(k)) {
        refs.push({ kind: k, id: file.slice(0, -".yaml".length) });
      }
    }
    return refs;
  }

  private path(ref: ConfigRef): string {
    const errors = refErrors(ref);
    if (errors.length) throw new ConfigError("Not a valid config reference:", errors);
    return join(this.root, ref.kind, `${ref.id}.yaml`);
  }

  private async folders(): Promise<string[]> {
    const entries = await readdir(this.root, { withFileTypes: true }).catch(emptyIfNotFound);
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  }

  private async files(kind: string): Promise<string[]> {
    const names = await readdir(join(this.root, kind)).catch(emptyIfNotFound);
    return names.filter((n) => n.endsWith(".yaml")).sort();
  }
}

// Node reports a missing file as an error with code "ENOENT".
function isNotFound(error: unknown): boolean {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

function emptyIfNotFound(error: unknown): never[] {
  if (isNotFound(error)) return [];
  throw error;
}
