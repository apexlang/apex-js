import { Context, Visitor } from "./visitor";
import { Location } from "./location";
import { Kind } from "./kinds";
import { Value } from "./values";

export interface Node {
  getKind(): Kind;
  isKind(kind: Kind): boolean;
  getLoc(): Location | undefined;
  accept(_context: Context, _visitor: Visitor): void;
}

export type NodeArray = Node[];

export abstract class AbstractNode implements Node {
  kind: Kind;
  loc?: Location;

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

  toObject(): { [k: string]: any } {
    let obj: { [k: string]: any } = {};
    this.arguments.map((arg) => {
      obj[arg.name.value] = arg.value.getValue();
    });
    return obj;
  }

  public accept(context: Context, visitor: Visitor): void {
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
    for (let l of this.locations) {
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
