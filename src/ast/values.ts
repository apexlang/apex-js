import { AbstractNode } from "./node";
import { Name } from "./name";
import { kinds } from "./kinds";
import { Location } from "./location";

export interface Value {
  getValue(): any; //interface{}
  getKind(): string;
  getLoc(): Location | undefined;
}

export class Variable extends AbstractNode implements Value {
  name: Name;

  constructor(loc: Location | undefined, name: Name) {
    super(kinds.Variable, loc);
    this.name = name;
  }

  getValue(): any {
    return this.GetName();
  }

  GetName(): any {
    return this.name;
  }
}

export class IntValue extends AbstractNode implements Value {
  value: string;

  constructor(loc: Location | undefined, value: string) {
    super(kinds.IntValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class FloatValue extends AbstractNode implements Value {
  value: string;

  constructor(loc: Location | undefined, value: string) {
    super(kinds.FloatValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class StringValue extends AbstractNode implements Value {
  value: string;

  constructor(loc: Location | undefined, value: string) {
    super(kinds.StringValue, loc);
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}

export class BooleanValue extends AbstractNode implements Value {
  value: boolean;

  constructor(loc: Location | undefined, value: boolean) {
    super(kinds.BooleanValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class EnumValue extends AbstractNode implements Value {
  value: string;

  constructor(loc: Location | undefined, value: string) {
    super(kinds.EnumValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class ListValue extends AbstractNode implements Value {
  value: Value[];

  constructor(loc: Location | undefined, value: Value[]) {
    super(kinds.ListValue, loc);
    this.value = value || null;
  }

  getValue(): any {
    return this.value;
  }
}

export class MapValue extends AbstractNode implements Value {
  value: Value[];

  constructor(loc: Location | undefined, value: Value[]) {
    super(kinds.MapValue, loc);
    this.value = value || null;
  }

  getValue(): any {
    return this.value;
  }
}

export class ObjectValue extends AbstractNode implements Value {
  fields: ObjectField[];

  constructor(loc: Location | undefined, fields: ObjectField[]) {
    super(kinds.ObjectValue, loc);
    this.fields = fields || null;
  }

  getValue(): any {
    return this.fields;
  }
}

export class ObjectField extends AbstractNode implements Value {
  value: Value;
  name: Name;

  constructor(loc: Location | undefined, value: Value, name: Name) {
    super(kinds.ObjectField, loc);
    this.value = value || null;
    this.name = name || null;
  }

  getValue(): any {
    return this.value;
  }
}
