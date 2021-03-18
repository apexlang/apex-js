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
    value?: string
  ) {
    this.kind = kind;
    this.start = start;
    this.end = end;
    this.value = value || "";
    this.prev = prev;
    this.next = null;
  }
}
