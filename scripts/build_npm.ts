// ex. scripts/build_npm.ts
import { build, emptyDir } from "https://deno.land/x/dnt@0.33.1/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./src/mod.ts"],
  outDir: "./npm",
  test: false,
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "@apexlang/core",
    version: Deno.args[0],
    description: "Apex language JavaScript support",
    keywords: ["apex", "idl", "codegen"],
    license: "Apache-2.0",
    repository: {
      type: "git",
      url: "https://www.github.com/apexlang/apex-js",
    },
    bugs: {
      url: "https://www.github.com/apexlang/apex-js/issues",
    },
  },
});

// post build steps
Deno.copyFileSync("LICENSE.txt", "npm/LICENSE.txt");
Deno.copyFileSync("README.md", "npm/README.md");
