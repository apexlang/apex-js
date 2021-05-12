// The following functions are from
// https://github.com/blakeembrey/change-case
// Pasted here to avoid an NPM dependency for the CLI.

export function camelCaseTransform(input: string, index: number) {
  if (index === 0) return input.toLowerCase();
  return pascalCaseTransform(input, index);
}

export function camelCaseTransformMerge(input: string, index: number) {
  if (index === 0) return input.toLowerCase();
  return pascalCaseTransformMerge(input);
}

export function camelCase(input: string, options: Options = {}) {
  return pascalCase(input, {
    transform: camelCaseTransform,
    ...options,
  });
}

export function pascalCaseTransform(input: string, index: number) {
  const firstChar = input.charAt(0);
  const lowerChars = input.substr(1).toLowerCase();
  if (index > 0 && firstChar >= "0" && firstChar <= "9") {
    return `_${firstChar}${lowerChars}`;
  }
  return `${firstChar.toUpperCase()}${lowerChars}`;
}

export function pascalCaseTransformMerge(input: string) {
  return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
}

export function pascalCase(input: string, options: Options = {}) {
  return noCase(input, {
    delimiter: "",
    transform: pascalCaseTransform,
    ...options,
  });
}

export function snakeCase(input: string, options: Options = {}) {
  return dotCase(input, {
    delimiter: "_",
    ...options,
  });
}

export function dotCase(input: string, options: Options = {}) {
  return noCase(input, {
    delimiter: ".",
    ...options,
  });
}

// Support camel case ("camelCase" -> "camel Case" and "CAMELCase" -> "CAMEL Case").
const DEFAULT_SPLIT_REGEXP = [/([a-z0-9])([A-Z])/g, /([A-Z])([A-Z][a-z])/g];

// Remove all non-word characters.
const DEFAULT_STRIP_REGEXP = /[^A-Z0-9]+/gi;

export interface Options {
  splitRegexp?: RegExp | RegExp[];
  stripRegexp?: RegExp | RegExp[];
  delimiter?: string;
  transform?: (part: string, index: number, parts: string[]) => string;
}

export function noCase(input: string, options: Options = {}) {
  const {
    splitRegexp = DEFAULT_SPLIT_REGEXP,
    stripRegexp = DEFAULT_STRIP_REGEXP,
    transform = lowerCase,
    delimiter = " ",
  } = options;

  let result = replace(
    replace(input, splitRegexp, "$1\0$2"),
    stripRegexp,
    "\0"
  );
  let start = 0;
  let end = result.length;

  // Trim the delimiter from around the output string.
  while (result.charAt(start) === "\0") start++;
  while (result.charAt(end - 1) === "\0") end--;

  // Transform each token independently.
  return result.slice(start, end).split("\0").map(transform).join(delimiter);
}

/**
 * Replace `re` in the input string with the replacement value.
 */
function replace(input: string, re: RegExp | RegExp[], value: string) {
  if (re instanceof RegExp) return input.replace(re, value);
  return re.reduce((input, re) => input.replace(re, value), input);
}

/**
 * Locale character mapping rules.
 */
interface Locale {
  regexp: RegExp;
  map: Record<string, string>;
}

/**
 * Source: ftp://ftp.unicode.org/Public/UCD/latest/ucd/SpecialCasing.txt
 */
const SUPPORTED_LOCALE: Record<string, Locale> = {
  tr: {
    regexp: /\u0130|\u0049|\u0049\u0307/g,
    map: {
      İ: "\u0069",
      I: "\u0131",
      İ: "\u0069",
    },
  },
  az: {
    regexp: /\u0130/g,
    map: {
      İ: "\u0069",
      I: "\u0131",
      İ: "\u0069",
    },
  },
  lt: {
    regexp: /\u0049|\u004A|\u012E|\u00CC|\u00CD|\u0128/g,
    map: {
      I: "\u0069\u0307",
      J: "\u006A\u0307",
      Į: "\u012F\u0307",
      Ì: "\u0069\u0307\u0300",
      Í: "\u0069\u0307\u0301",
      Ĩ: "\u0069\u0307\u0303",
    },
  },
};

/**
 * Localized lower case.
 */
export function localeLowerCase(str: string, locale: string) {
  const lang = SUPPORTED_LOCALE[locale.toLowerCase()];
  if (lang) return lowerCase(str.replace(lang.regexp, (m) => lang.map[m]));
  return lowerCase(str);
}

/**
 * Lower case as a function.
 */
export function lowerCase(str: string) {
  return str.toLowerCase();
}
