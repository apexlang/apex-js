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

import { Context, Visitor } from "./visitor.ts";
import { Location } from "./location.ts";
import { Kind } from "./kinds.ts";
import { Value } from "./values.ts";

export interface Node {
  getKind(): Kind;
  isKind(kind: Kind): boolean;
  getLoc(): Location | undefined;
  accept(_context: Context, _visitor: Visitor): void;
}

export abstract class AbstractNode implements Node {
  kind: Kind;
  loc?: Location;
  imported = false;

  constructor(kind: Kind, loc: Location | undefined) {
    this.kind = kind;
    this.loc = loc;
  }

  public getKind(): Kind {
    return this.kind;
  }

  public getLoc(): Location | undefined {
    return this.loc;
  }

  public isKind(kind: Kind): boolean {
    return this.kind === kind;
  }

  public accept(_context: Context, _visitor: Visitor): void {}
}

// Name implements Node
export class Name extends AbstractNode {
  value: string;

  constructor(doc: Location | undefined, value: string) {
    super(Kind.Name, doc);
    this.value = value || "";
  }
}

// Annotation implements Node
export class Annotation extends AbstractNode {
  name: Name;
  arguments: Argument[];

  constructor(loc: Location | undefined, name: Name, args?: Argument[]) {
    super(Kind.Annotation, loc);
    this.name = name;
    this.arguments = args || [];
  }

  convert<T>(): T {
    // deno-lint-ignore no-explicit-any
    const obj: { [k: string]: any } = {};
    this.arguments.map((arg) => {
      obj[arg.name.value] = arg.value.getValue();
    });
    return obj as T;
  }

  public override accept(context: Context, visitor: Visitor): void {
    visitor.visitAnnotation(context);
  }
}

// Argument implements Node
export class Argument extends AbstractNode {
  name: Name;
  value: Value;

  constructor(loc: Location | undefined, name: Name, value: Value) {
    super(Kind.Argument, loc);
    this.name = name || undefined;
    this.value = value || undefined;
  }
}

export class DirectiveRequire extends AbstractNode {
  directive: Name;
  locations: Name[];

  constructor(doc: Location | undefined, directive: Name, locations: Name[]) {
    super(Kind.DirectiveRequire, doc);
    this.directive = directive;
    this.locations = locations;
  }

  public hasLocation(location: string): boolean {
    for (const l of this.locations) {
      if (l.value == location) {
        return true;
      }
    }
    return false;
  }
}

export class ImportName extends AbstractNode {
  name: Name;
  alias: Name | undefined;

  constructor(doc: Location | undefined, name: Name, alias: Name | undefined) {
    super(Kind.ImportName, doc);
    this.name = name;
    this.alias = alias;
  }
}
