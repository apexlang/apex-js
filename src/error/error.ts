import { Node, Source } from "../ast";

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

export function importError(node: Node, description: string): WidlError {
  const loc = node.getLoc();
  var source: Source | undefined;
  if (loc != undefined) {
    source = loc.source;
  }
  return new WidlError(
    `Import Error: ${description}`,
    node,
    source,
    undefined,
    undefined
  );
}

export function validationError(node: Node, description: string): WidlError {
  const loc = node.getLoc();
  var source: Source | undefined;
  if (loc != undefined) {
    source = loc.source;
  }
  return new WidlError(
    `Validation Error: ${description}`,
    node,
    source,
    undefined,
    undefined
  );
}
