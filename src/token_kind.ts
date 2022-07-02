/*
Copyright 2022 The Apex Authors.

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

/**
 * The enum type representing the token kinds values.
 */
export enum TokenKind {
  EOF = 1,
  BANG,
  QUESTION,
  DOLLAR,
  PAREN_L,
  PAREN_R,
  SPREAD,
  COLON,
  EQUALS,
  STAR,
  AT,
  BRACKET_L,
  BRACKET_R,
  BRACE_L,
  PIPE,
  BRACE_R,
  NAME,
  NS,
  INT,
  FLOAT,
  STRING,
  BLOCK_STRING,
  AMP,
  SOF,
  COMMENT,
}

export const TokenDescription = new Map<number, string>([
  [TokenKind.EOF, "EOF"],
  [TokenKind.BANG, "!"],
  [TokenKind.QUESTION, "?"],
  [TokenKind.DOLLAR, "$"],
  [TokenKind.PAREN_L, "("],
  [TokenKind.PAREN_R, ")"],
  [TokenKind.SPREAD, "..."],
  [TokenKind.COLON, ":"],
  [TokenKind.EQUALS, "="],
  [TokenKind.STAR, "*"],
  [TokenKind.AT, "@"],
  [TokenKind.BRACKET_L, "["],
  [TokenKind.BRACKET_R, "]"],
  [TokenKind.BRACE_L, "{"],
  [TokenKind.PIPE, "|"],
  [TokenKind.BRACE_R, "}"],
  [TokenKind.NAME, "Name"],
  [TokenKind.NS, "NS"],
  [TokenKind.INT, "Int"],
  [TokenKind.FLOAT, "Float"],
  [TokenKind.STRING, "String"],
  [TokenKind.BLOCK_STRING, "BlockString"],
  [TokenKind.AMP, "&"],
  [TokenKind.SOF, "SOF"],
  [TokenKind.COMMENT, "Comment"],
]);
