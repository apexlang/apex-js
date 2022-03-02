import { Node, Source } from "../ast/index.js";

export class ApexError extends Error {
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
): ApexError {
  return new ApexError(
    `Syntax Error: ${description}`,
    undefined,
    source,
    [position],
    undefined
  );
}

export function importError(node: Node, description: string): ApexError {
  const loc = node.getLoc();
  var source: Source | undefined;
  if (loc != undefined) {
    source = loc.source;
  }
  return new ApexError(
    `Import Error: ${description}`,
    node,
    source,
    undefined,
    undefined
  );
}

export function validationError(node: Node, description: string): ApexError {
  const loc = node.getLoc();
  var source: Source | undefined;
  if (loc != undefined) {
    source = loc.source;
  }
  return new ApexError(
    `Validation Error: ${description}`,
    node,
    source,
    undefined,
    undefined
  );
}
