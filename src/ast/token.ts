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

export class Token {
  /**
   * The kind of Token.
   */
  kind: number;

  /**
   * The character offset at which this Node begins.
   */
  start: number;

  /**
   * The character offset at which this Node ends.
   */
  end: number;

  /**
   * For non-punctuation tokens, represents the interpreted value of the token.
   */
  value: string;

  /**
   * Tokens exist as nodes in a double-linked-list amongst all tokens
   * including ignored tokens. <SOF> is always the first node and <EOF>
   * the last.
   */
  prev: Token | null;
  next: Token | null;

  constructor(
    kind: number,
    start: number,
    end: number,
    prev: Token | null,
    value?: string,
  ) {
    this.kind = kind;
    this.start = start;
    this.end = end;
    this.value = value || "";
    this.prev = prev;
    this.next = null;
  }
}
