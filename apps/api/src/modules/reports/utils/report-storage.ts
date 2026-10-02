import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

export class ReportStorage {
  readonly root: string;

  constructor(storagePath: string) {
    this.root = resolve(storagePath);
  }

  async initialize() {
    await Promise.all(["pdf", "html", "json", "csv"].map((folder) => mkdir(resolve(this.root, folder), { recursive: true })));
  }

  async write(reportId: string, extension: "pdf" | "html" | "json" | "csv", contents: string | Buffer) {
    await this.initialize();
    const target = this.safePath(`${extension}/${reportId}.${extension}`);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(temporary, contents);
    await rename(temporary, target);
    return this.relativePath(target);
  }

  read(path: string) {
    return readFile(this.safePath(path));
  }

  async deleteMany(paths: Array<string | null | undefined>) {
    await Promise.all(paths.filter((path): path is string => Boolean(path)).map((path) => rm(this.safePath(path), { force: true })));
  }

  private safePath(path: string) {
    const candidate = resolve(this.root, isAbsolute(path) ? relative(this.root, path) : path);
    const relation = relative(this.root, candidate);
    if (relation.startsWith("..") || isAbsolute(relation)) throw new Error("Invalid report storage path.");
    return candidate;
  }

  private relativePath(path: string) {
    return relative(this.root, path).replace(/\\/g, "/");
  }
}
