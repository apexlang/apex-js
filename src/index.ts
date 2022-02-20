export * from "./parser";
export * from "./validator";

// Expose `Apex.ast` for the browser
import * as astAll from "./ast";
export const AST = astAll;
export const ast = astAll;

// Expose `Apex.error` for the browser
import * as errorAll from "./error";
export const error = errorAll;
export const Error = errorAll;

// Expose `Apex.rules` for the browser
import * as rulesAll from "./rules";
export const rules = rulesAll;
export const Rules = rulesAll;
