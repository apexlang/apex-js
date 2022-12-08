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

import { AbstractNode, Name, Node } from "./nodes.ts";
import { Kind } from "./kinds.ts";
import { Location } from "./location.ts";

export interface Value extends Node {
  getValue(): any;
  getKind(): Kind;
  isKind(kind: Kind): boolean;
  getLoc(): Location | undefined;
}

export class IntValue extends AbstractNode implements Value {
  value: number;

  constructor(loc: Location | undefined, value: number) {
    super(Kind.IntValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class FloatValue extends AbstractNode implements Value {
  value: number;

  constructor(loc: Location | undefined, value: number) {
    super(Kind.FloatValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class StringValue extends AbstractNode implements Value {
  value: string;

  constructor(loc: Location | undefined, value: string) {
    super(Kind.StringValue, loc);
    this.value = value;
  }

  getValue(): string {
    return this.value;
  }
}

export class BooleanValue extends AbstractNode implements Value {
  value: boolean;

  constructor(loc: Location | undefined, value: boolean) {
    super(Kind.BooleanValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class EnumValue extends AbstractNode implements Value {
  value: string;

  constructor(loc: Location | undefined, value: string) {
    super(Kind.EnumValue, loc);
    this.value = value;
  }

  getValue(): any {
    return this.value;
  }
}

export class ListValue extends AbstractNode implements Value {
  value: Value[];

  constructor(loc: Location | undefined, value: Value[]) {
    super(Kind.ListValue, loc);
    this.value = value || null;
  }

  getValue(): any {
    return this.value.map((item) => item.getValue());
  }
}

export class ObjectValue extends AbstractNode implements Value {
  fields: ObjectField[];

  constructor(loc: Location | undefined, fields: ObjectField[]) {
    super(Kind.ObjectValue, loc);
    this.fields = fields || null;
  }

  get(key: string): Value | undefined {
    for (let field of this.fields) {
      if (field.name.value == key) {
        return field.value;
      }
    }
    return undefined;
  }

  getValue(): any {
    let obj: { [k: string]: any } = {};
    this.fields.map((field) => {
      obj[field.name.value] = field.value.getValue();
    });
    return obj;
  }
}

export class ObjectField extends AbstractNode implements Value {
  name: Name;
  value: Value;

  constructor(loc: Location | undefined, name: Name, value: Value) {
    super(Kind.ObjectField, loc);
    this.name = name || null;
    this.value = value || null;
  }

  getValue(): any {
    return this.value.getValue();
  }
}
