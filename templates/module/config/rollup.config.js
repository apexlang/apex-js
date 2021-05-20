import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import pkg from "../package.json";

export default [
  // browser-friendly UMD build
  {
    input: "dist/cjs/index.js",
    external: [
      "@wapc/widl",
      "@wapc/widl/ast"
    ],
    output: {
      name: "widl.codegen",
      file: pkg.browser,
      format: "umd",
      sourcemap: true,
      globals: {
        '@wapc/widl': 'widl',
        '@wapc/widl/ast': 'widl.ast'
      }
    },
    plugins: [commonjs(), resolve()],
  },
];
