import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import pkg from "../package.json";

export default [
  // browser-friendly UMD build
  {
    input: "dist/cjs/index.js",
    external: [
      "@apexlang/core",
      "@apexlang/core/ast"
    ],
    output: {
      name: "apex.codegen",
      file: pkg.browser,
      format: "umd",
      sourcemap: true,
      globals: {
        '@apexlang/core': 'apex',
        '@apexlang/core/ast': 'apex.ast'
      }
    },
    plugins: [commonjs(), resolve()],
  },
];
