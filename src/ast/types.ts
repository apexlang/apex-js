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

import { AbstractNode, Name, Node } from "./nodes.js";
import { Kind } from "./kinds.js";
import { Location } from "./location.js";

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
