import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import pkg from "../package.json";

export default [
  // browser-friendly UMD build
  {
    input: "dist/cjs/index.js",
    output: {
      name: "widl",
      file: pkg.browser,
      format: "umd",
      sourcemap: true,
    },
    plugins: [commonjs(), resolve()],
  },
];
