import { Context, Visitor } from "./visitor";
import { Location } from "./location";

export interface Node {
  getKind(): string;
  getLoc(): Location | undefined;
  accept(_context: Context, _visitor: Visitor): void;
}

export type NodeArray = Node[];

export abstract class AbstractNode implements Node {
  kind: string;
  loc?: Location;

  constructor(kind: string, loc: Location | undefined) {
    this.kind = kind || "";
    this.loc = loc;
  }

  public getKind(): string {
    return this.kind;
  }

  public getLoc(): Location | undefined {
    return this.loc;
  }

  public accept(_context: Context, _visitor: Visitor): void {}
}
