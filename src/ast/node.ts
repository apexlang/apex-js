import { Context, Visitor } from "./visitor";
import { Location } from "./location";

export interface Node {
  getKind(): string;
  getLoc(): Location | undefined;
  accept(_context: Context, _visitor: Visitor): void;
  isKind(node: any): boolean;
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

  public isKind(node: any): boolean {
    if (node === undefined && node === null) return false;
    return node.name === this.kind;
  }

  public accept(_context: Context, _visitor: Visitor): void {}
}
