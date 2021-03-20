import { Name } from "./name";
import { AbstractNode } from "./node";
import { kinds } from "./kinds";
import { Location } from "./location";

export interface Type {
  getKind(): string;
  getLoc(): Location | undefined;
  string(): string;
}

export class Named extends AbstractNode implements Type {
  Name: Name;

  constructor(loc: Location | undefined, name: Name) {
    super(kinds.Named, loc);
    this.Name = name;
  }

  public string(): string {
    return this.getKind();
  }
}

export class List extends AbstractNode implements Type {
  type: Type;

  constructor(loc: Location | undefined, type: Type) {
    super(kinds.List, loc);
    this.type = type || null;
  }

  public string(): string {
    return this.getKind();
  }
}

export class Map extends AbstractNode implements Type {
  keyType: Type;
  valueType: Type;

  constructor(loc: Location | undefined, keyType: Type, valueType: Type) {
    super(kinds.Map, loc);
    this.keyType = keyType || null;
    this.valueType = valueType || null;
  }

  public string(): string {
    return this.getKind();
  }
}

export class Optional extends AbstractNode implements Type {
  type: Type;

  constructor(loc: Location | undefined, type: Type) {
    super(kinds.Optional, loc);
    this.type = type || null;
  }

  public string(): string {
    return this.getKind();
  }
}
