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

import { Node, Source } from "../ast/mod.ts";

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
    path: Array<string | number> | undefined,
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
  description: string,
): ApexError {
  return new ApexError(
    `Syntax Error: ${description}`,
    undefined,
    source,
    [position],
    undefined,
  );
}

export function importError(node: Node, description: string): ApexError {
  const loc = node.getLoc();
  let source: Source | undefined;
  if (loc != undefined) {
    source = loc.source;
  }
  return new ApexError(
    `Import Error: ${description}`,
    node,
    source,
    undefined,
    undefined,
  );
}

export function validationError(node: Node, description: string): ApexError {
  const loc = node.getLoc();
  let source: Source | undefined;
  if (loc != undefined) {
    source = loc.source;
  }
  return new ApexError(
    `Validation Error: ${description}`,
    node,
    source,
    undefined,
    undefined,
  );
}
