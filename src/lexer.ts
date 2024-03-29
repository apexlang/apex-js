/*
Copyright 2024 The Apex Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// @flow strict

//import { syntaxError } from '../error/syntaxError';

import { Source, Token } from "./ast/mod.ts";
import { dedentBlockStringValue } from "./blockstring.ts";
import { TokenDescription, TokenKind } from "./token_kind.ts";
import { syntaxError } from "./error/mod.ts";
/**
 * Given a Source object, creates a Lexer for that source.
 * A Lexer is a stateful stream generator in that every time
 * it is advanced, it returns the next token in the Source. Assuming the
 * source lexes, the final Token emitted by the lexer will be of kind
 * EOF, after which the lexer will repeatedly return the same EOF token
 * whenever called.
 */
export class Lexer {
  source: Source;

  /**
   * The previously focused non-ignored token.
   */
  lastToken: Token;

  /**
   * The currently focused non-ignored token.
   */
  token: Token;

  /**
   * The (1-indexed) line containing the current token.
   */
  line: number;

  /**
   * The character offset at which the current line begins.
   */
  lineStart: number;

  constructor(source: Source) {
    const startOfFileToken = new Token(TokenKind.SOF, 0, 0, null);

    this.source = source;
    this.lastToken = startOfFileToken;
    this.token = startOfFileToken;
    this.line = 1;
    this.lineStart = 0;
  }

  /**
   * Advances the token stream to the next non-ignored token.
   */
  advance(): Token {
    this.lastToken = this.token;
    const token = (this.token = this.lookahead());
    return token;
  }

  /**
   * Looks ahead and returns the next non-ignored token, but does not change
   * the state of Lexer.
   */
  lookahead(): Token {
    let token = this.token;
    if (token.kind !== TokenKind.EOF) {
      do {
        // Note: next is only mutable during parsing, so we cast to allow this.
        token = token.next ?? (token.next = readToken(this, token));
      } while (token.kind === TokenKind.COMMENT);
    }
    return token;
  }
}

/**
 * @internal
 */
export function isPunctuatorTokenKind(kind: TokenKind): boolean {
  return (
    kind === TokenKind.BANG ||
    kind === TokenKind.DOLLAR ||
    kind === TokenKind.AMP ||
    kind === TokenKind.PAREN_L ||
    kind === TokenKind.PAREN_R ||
    kind === TokenKind.SPREAD ||
    kind === TokenKind.COLON ||
    kind === TokenKind.EQUALS ||
    kind === TokenKind.STAR ||
    kind === TokenKind.AT ||
    kind === TokenKind.BRACKET_L ||
    kind === TokenKind.BRACKET_R ||
    kind === TokenKind.BRACE_L ||
    kind === TokenKind.PIPE ||
    kind === TokenKind.BRACE_R
  );
}

/**
 * Gets the next token from the source starting at the given position.
 *
 * This skips over whitespace until it finds the next lexable token, then lexes
 * punctuators immediately or calls the appropriate helper function for more
 * complicated tokens.
 */
function readToken(lexer: Lexer, prev: Token): Token {
  const source = lexer.source;
  const body = source.body;
  const bodyLength = body.length;

  const pos = positionAfterWhitespace(body, prev.end, lexer);
  const line = lexer.line;
  const col = 1 + pos - lexer.lineStart;

  if (pos >= bodyLength) {
    return new Token(TokenKind.EOF, bodyLength, bodyLength, prev);
  }

  const code = body.charCodeAt(pos);

  // SourceCharacter
  switch (code) {
    // !
    case 33:
      return new Token(TokenKind.BANG, pos, pos + 1, prev);
    // #
    case 35:
      return readComment(source, pos, line, col, prev);
    // $
    case 36:
      return new Token(TokenKind.DOLLAR, pos, pos + 1, prev);
    // &
    case 38:
      return new Token(TokenKind.AMP, pos, pos + 1, prev);
    // (
    case 40:
      return new Token(TokenKind.PAREN_L, pos, pos + 1, prev);
    // )
    case 41:
      return new Token(TokenKind.PAREN_R, pos, pos + 1, prev);
    // *
    case 42:
      return new Token(TokenKind.STAR, pos, pos + 1, prev);
    // .
    case 46:
      if (body.charCodeAt(pos + 1) === 46 && body.charCodeAt(pos + 2) === 46) {
        return new Token(TokenKind.SPREAD, pos, pos + 3, prev);
      }
      break;
    // :
    case 58:
      return new Token(TokenKind.COLON, pos, pos + 1, prev);
    // =
    case 61:
      return new Token(TokenKind.EQUALS, pos, pos + 1, prev);
    // ?
    case 63:
      return new Token(TokenKind.QUESTION, pos, pos + 1, prev);
    // @
    case 64:
      return new Token(TokenKind.AT, pos, pos + 1, prev);
    // [
    case 91:
      return new Token(TokenKind.BRACKET_L, pos, pos + 1, prev);
    // ]
    case 93:
      return new Token(TokenKind.BRACKET_R, pos, pos + 1, prev);
    // {
    case 123:
      return new Token(TokenKind.BRACE_L, pos, pos + 1, prev);
    // |
    case 124:
      return new Token(TokenKind.PIPE, pos, pos + 1, prev);
    // }
    case 125:
      return new Token(TokenKind.BRACE_R, pos, pos + 1, prev);
    // A-Z _ a-z
    case 65:
    case 66:
    case 67:
    case 68:
    case 69:
    case 70:
    case 71:
    case 72:
    case 73:
    case 74:
    case 75:
    case 76:
    case 77:
    case 78:
    case 79:
    case 80:
    case 81:
    case 82:
    case 83:
    case 84:
    case 85:
    case 86:
    case 87:
    case 88:
    case 89:
    case 90:
    case 95:
    case 97:
    case 98:
    case 99:
    case 100:
    case 101:
    case 102:
    case 103:
    case 104:
    case 105:
    case 106:
    case 107:
    case 108:
    case 109:
    case 110:
    case 111:
    case 112:
    case 113:
    case 114:
    case 115:
    case 116:
    case 117:
    case 118:
    case 119:
    case 120:
    case 121:
    case 122:
      return readName(source, pos, line, col, prev);
    // - 0-9
    case 45:
    case 48:
    case 49:
    case 50:
    case 51:
    case 52:
    case 53:
    case 54:
    case 55:
    case 56:
    case 57:
      return readNumber(source, pos, code, line, col, prev);
    // "
    case 34:
      if (body.charCodeAt(pos + 1) === 34 && body.charCodeAt(pos + 2) === 34) {
        return readBlockString(source, pos, line, col, prev, lexer);
      }
      return readString(source, pos, line, col, prev);
  }

  throw syntaxError(source, pos, "unexpected char");
}

/**
 * Reads from body starting at startPosition until it finds a non-whitespace
 * character, then returns the position of that character for lexing.
 */
function positionAfterWhitespace(
  body: string,
  startPosition: number,
  lexer: Lexer,
): number {
  const bodyLength = body.length;
  let position = startPosition;
  while (position < bodyLength) {
    const code = body.charCodeAt(position);
    // tab | space | comma | BOM
    if (code === 9 || code === 32 || code === 44 || code === 0xfeff) {
      ++position;
    } else if (code === 10) {
      // new line
      ++position;
      ++lexer.line;
      lexer.lineStart = position;
    } else if (code === 13) {
      // carriage return
      if (body.charCodeAt(position + 1) === 10) {
        position += 2;
      } else {
        ++position;
      }
      ++lexer.line;
      lexer.lineStart = position;
    } else {
      break;
    }
  }
  return position;
}

/**
 * Reads a comment token from the source file.
 *
 * #[\u0009\u0020-\uFFFF]*
 */
function readComment(
  source: Source,
  start: number,
  _line: number,
  _col: number,
  prev: Token,
): Token {
  const body = source.body;
  let code;
  let position = start;

  do {
    code = body.charCodeAt(++position);
  } while (
    !isNaN(code) &&
    // SourceCharacter but not LineTerminator
    (code > 0x001f || code === 0x0009)
  );

  return new Token(
    TokenKind.COMMENT,
    start,
    position,
    prev,
    body.slice(start + 1, position),
  );
}

/**
 * Reads a number token from the source file, either a float
 * or an int depending on whether a decimal point appears.
 *
 * Int:   -?(0|[1-9][0-9]*)
 * Float: -?(0|[1-9][0-9]*)(\.[0-9]+)?((E|e)(+|-)?[0-9]+)?
 */
function readNumber(
  source: Source,
  start: number,
  firstCode: number,
  _line: number,
  _col: number,
  prev: Token,
): Token {
  const body = source.body;
  let code = firstCode;
  let position = start;
  let isFloat = false;

  if (code === 45) {
    // -
    code = body.charCodeAt(++position);
  }

  if (code === 48) {
    // 0
    code = body.charCodeAt(++position);
    if (code >= 48 && code <= 57) {
      /*
      throw syntaxError(
        source,
        position,
        `Invalid number, unexpected digit after 0: ${printCharCode(code)}.`,
      );*/
    }
  } else {
    position = readDigits(source, position, code);
    code = body.charCodeAt(position);
  }

  if (code === 46) {
    // .
    isFloat = true;

    code = body.charCodeAt(++position);
    position = readDigits(source, position, code);
    code = body.charCodeAt(position);
  }

  if (code === 69 || code === 101) {
    // E e
    isFloat = true;

    code = body.charCodeAt(++position);
    if (code === 43 || code === 45) {
      // + -
      code = body.charCodeAt(++position);
    }
    position = readDigits(source, position, code);
    code = body.charCodeAt(position);
  }

  // Numbers cannot be followed by . or NameStart
  if (code === 46 || isNameStart(code)) {
    /*
    throw syntaxError(
      source,
      position,
      `Invalid number, expected digit but got: ${printCharCode(code)}.`,
    );*/
  }

  return new Token(
    isFloat ? TokenKind.FLOAT : TokenKind.INT,
    start,
    position,
    prev,
    body.slice(start, position),
  );
}

/**
 * Returns the new position in the source after reading digits.
 */
function readDigits(source: Source, start: number, firstCode: number): number {
  const body = source.body;
  let position = start;
  let code = firstCode;
  if (code >= 48 && code <= 57) {
    // 0 - 9
    do {
      code = body.charCodeAt(++position);
    } while (code >= 48 && code <= 57); // 0 - 9
    return position;
  }
  return -1; // Remove this
  // TODO
  /*
  throw syntaxError(
    source,
    position,
    `Invalid number, expected digit but got: ${printCharCode(code)}.`,
  );*/
}

/**
 * Reads a string token from the source file.
 *
 * "([^"\\\u000A\u000D]|(\\(u[0-9a-fA-F]{4}|["\\/bfnrt])))*"
 */
function readString(
  source: Source,
  start: number,
  _line: number,
  _col: number,
  prev: Token,
): Token {
  const body = source.body;
  let position = start + 1;
  let chunkStart = position;
  let code = 0;
  let value = "";

  while (
    position < body.length &&
    !isNaN(code = body.charCodeAt(position)) &&
    // not LineTerminator
    code !== 0x000a &&
    code !== 0x000d
  ) {
    // Closing Quote (")
    if (code === 34) {
      value += body.slice(chunkStart, position);
      return new Token(TokenKind.STRING, start, position + 1, prev, value);
    }

    // SourceCharacter
    if (code < 0x0020 && code !== 0x0009) {
      // TODO
      /*
      throw syntaxError(
        source,
        position,
        `Invalid character within String: ${printCharCode(code)}.`,
      );
      */
    }

    ++position;
    if (code === 92) {
      // \
      value += body.slice(chunkStart, position - 1);
      code = body.charCodeAt(position);
      switch (code) {
        case 34:
          value += '"';
          break;
        case 47:
          value += "/";
          break;
        case 92:
          value += "\\";
          break;
        case 98:
          value += "\b";
          break;
        case 102:
          value += "\f";
          break;
        case 110:
          value += "\n";
          break;
        case 114:
          value += "\r";
          break;
        case 116:
          value += "\t";
          break;
        case 117: {
          // uXXXX
          const charCode = uniCharCode(
            body.charCodeAt(position + 1),
            body.charCodeAt(position + 2),
            body.charCodeAt(position + 3),
            body.charCodeAt(position + 4),
          );
          if (charCode < 0) {
            throw syntaxError(source, position, "invalid sequence");
            /*throw syntaxError(
              source,
              position,
              `Invalid character escape sequence: \\u${invalidSequence}.`,
            );*/
          }
          value += String.fromCharCode(charCode);
          position += 4;
          break;
        }
        default:
          throw syntaxError(
            source,
            position,
            "Invalid character escape sequence",
          );
          /*throw syntaxError(
            source,
            position,
            `Invalid character escape sequence: \\${String.fromCharCode(
              code,
            )}.`,
          );*/
      }
      ++position;
      chunkStart = position;
    }
  }
  throw syntaxError(source, position, "Unterminated string.");
  //throw syntaxError(source, position, 'Unterminated string.');
}

/**
 * Reads a block string token from the source file.
 *
 * """("?"?(\\"""|\\(?!=""")|[^"\\]))*"""
 */
function readBlockString(
  source: Source,
  start: number,
  _line: number,
  _col: number,
  prev: Token,
  lexer: Lexer,
): Token {
  const body = source.body;
  let position = start + 3;
  let chunkStart = position;
  let code = 0;
  let rawValue = "";

  while (position < body.length && !isNaN(code = body.charCodeAt(position))) {
    // Closing Triple-Quote (""")
    if (
      code === 34 &&
      body.charCodeAt(position + 1) === 34 &&
      body.charCodeAt(position + 2) === 34
    ) {
      rawValue += body.slice(chunkStart, position);
      return new Token(
        TokenKind.BLOCK_STRING,
        start,
        position + 3,
        prev,
        dedentBlockStringValue(rawValue),
      );
    }

    // SourceCharacter
    if (
      code < 0x0020 &&
      code !== 0x0009 &&
      code !== 0x000a &&
      code !== 0x000d
    ) {
      throw syntaxError(
        source,
        position,
        "Invalid character within String: ${printCharCode(code)}",
      );
      /*
      throw syntaxError(
        source,
        position,
        `Invalid character within String: ${printCharCode(code)}.`,
      );
      */
    }

    if (code === 10) {
      // new line
      ++position;
      ++lexer.line;
      lexer.lineStart = position;
    } else if (code === 13) {
      // carriage return
      if (body.charCodeAt(position + 1) === 10) {
        position += 2;
      } else {
        ++position;
      }
      ++lexer.line;
      lexer.lineStart = position;
    } else if (
      // Escape Triple-Quote (\""")
      code === 92 &&
      body.charCodeAt(position + 1) === 34 &&
      body.charCodeAt(position + 2) === 34 &&
      body.charCodeAt(position + 3) === 34
    ) {
      rawValue += body.slice(chunkStart, position) + '"""';
      position += 4;
      chunkStart = position;
    } else {
      ++position;
    }
  }

  throw syntaxError(source, position, "Unterminated string.");
  //throw syntaxError(source, position, 'Unterminated string.');
}

/**
 * Converts four hexadecimal chars to the integer that the
 * string represents. For example, uniCharCode('0','0','0','f')
 * will return 15, and uniCharCode('0','0','f','f') returns 255.
 *
 * Returns a negative number on error, if a char was invalid.
 *
 * This is implemented by noting that char2hex() returns -1 on error,
 * which means the result of ORing the char2hex() will also be negative.
 */
function uniCharCode(a: number, b: number, c: number, d: number) {
  return (
    (char2hex(a) << 12) | (char2hex(b) << 8) | (char2hex(c) << 4) | char2hex(d)
  );
}

/**
 * Converts a hex character to its integer value.
 * '0' becomes 0, '9' becomes 9
 * 'A' becomes 10, 'F' becomes 15
 * 'a' becomes 10, 'f' becomes 15
 *
 * Returns -1 on error.
 */
function char2hex(a: number) {
  return a >= 48 && a <= 57
    ? a - 48 // 0-9
    : a >= 65 && a <= 70
    ? a - 55 // A-F
    : a >= 97 && a <= 102
    ? a - 87 // a-f
    : -1;
}

/**
 * Reads an alphanumeric + underscore name from the source.
 *
 * [_A-Za-z][_0-9A-Za-z]*
 */
function readName(
  source: Source,
  start: number,
  _line: number,
  _col: number,
  prev: Token,
): Token {
  const body = source.body;
  const bodyLength = body.length;
  let position = start + 1;
  let code = 0;
  while (
    position !== bodyLength &&
    !isNaN(code = body.charCodeAt(position)) &&
    (code === 95 || // _
      (code >= 48 && code <= 57) || // 0-9
      (code >= 65 && code <= 90) || // A-Z
      (code >= 97 && code <= 122)) // a-z
  ) {
    ++position;
  }
  return new Token(
    TokenKind.NAME,
    start,
    position,
    prev,
    body.slice(start, position),
  );
}

// _ A-Z a-z
function isNameStart(code: number): boolean {
  return (
    code === 95 || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
  );
}

/**
 * A helper function to describe a token as a string for debugging
 */
export function getTokenDesc(token: Token): string {
  const desc = getTokenKindDesc(token.kind);
  if (token.value == "") {
    return desc;
  }

  return `kind: ${desc} \"${token.value}\"`;
}

/**
 * A helper function to describe a token kind as a string for debugging
 */
export function getTokenKindDesc(kind: number): string {
  return TokenDescription.get(kind) || "";
}
