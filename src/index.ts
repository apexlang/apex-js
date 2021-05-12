export * from "./parser";
export * from "./validator";

// Expose `widl.ast` for the browser
import * as astAll from "./ast";
export const ast = astAll;

// Expose `widl.error` for the browser
import * as errorAll from "./error";
export const error = errorAll;

// Expose `widl.rules` for the browser
import * as rulesAll from "./rules";
export const rules = rulesAll;
