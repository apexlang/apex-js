import { AbstractNode, Name, Node } from "./nodes";
import { Kind } from "./kinds";
import { Location } from "./location";

export interface Type extends Node {
  string(): string;
}

export class Named extends AbstractNode implements Type {
  name: Name;

  constructor(loc: Location | undefined, name: Name) {
    super(Kind.Named, loc);
    this.name = name;
  }

  public string(): string {
    return this.getKind();
  }
}

export class ListType extends AbstractNode implements Type {
  type: Type;

  constructor(loc: Location | undefined, type: Type) {
    super(Kind.ListType, loc);
    this.type = type || null;
  }

  public string(): string {
    return this.getKind();
  }
}

export class MapType extends AbstractNode implements Type {
  keyType: Type;
  valueType: Type;

  constructor(loc: Location | undefined, keyType: Type, valueType: Type) {
    super(Kind.MapType, loc);
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
    super(Kind.Optional, loc);
    this.type = type || null;
  }

  public string(): string {
    return this.getKind();
  }
}

export class Stream extends AbstractNode implements Type {
  type: Type;

  constructor(loc: Location | undefined, type: Type) {
    super(Kind.Stream, loc);
    this.type = type || null;
  }

  public string(): string {
    return this.getKind();
  }
}
