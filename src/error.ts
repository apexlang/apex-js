import { Node, Source } from "./ast";

export class WidlError extends Error {
  nodes: Array<Node> | Node | undefined;
  source: Source | undefined;
  positions: Array<number> | undefined;
  path: Array<string | number> | undefined;

  constructor(
    message: string,
    nodes: Array<Node> | Node | undefined,
    source: Source | undefined,
    positions: Array<number> | undefined,
    path: Array<string | number> | undefined
  ) {
    super(message);
    this.nodes = nodes;
    this.source = source;
    this.positions = positions;
    this.path = path;
  }
}

export function syntaxError(
  source: Source,
  position: number,
  description: string
): WidlError {
  return new WidlError(
    `Syntax Error: ${description}`,
    undefined,
    source,
    [position],
    undefined
  );
}
