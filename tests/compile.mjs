import ts from "typescript";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../src/lib/", import.meta.url));
const cache = new Map();
export function compile(name) {
  const path = resolve(root, name + ".ts");
  if (cache.has(path)) return cache.get(path);
  let js = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  js = js.replace(/(from\s*|import\s*\()(["'])([^"']+)\2/g, (all, prefix, quote, spec) => {
    if (spec.startsWith("node:")) return all;
    const target = spec.startsWith(".")
      ? compile(resolve(dirname(path), spec).slice(root.length))
      : import.meta.resolve(spec);
    return prefix + JSON.stringify(target);
  });
  const url = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  cache.set(path, url);
  return url;
}
