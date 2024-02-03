// ex. scripts/build_npm.ts
import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: [
    "./src/mod.ts",
    "./src/ast.ts",
    "./src/error.ts",
    "./src/rules.ts",
    "./src/model.ts",
  ],
  outDir: "./npm",
  test: false,
  shims: {
    // see JS docs for overview and more options
    deno: false,
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
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
  },
});
