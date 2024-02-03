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

import { AbstractVisitor, Context, Node } from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

export class UniqueObjectNames extends AbstractVisitor {
  private typeNames: Set<string> = new Set<string>();

  visitNamespace(_context: Context): void {
    this.typeNames = new Set<string>();
  }
  visitInterface(context: Context): void {
    this.check(context, context.interface!.name.value, context.interface!.name);
  }
  visitType(context: Context): void {
    this.check(context, context.type!.name.value, context.type!.name);
  }
  visitUnion(context: Context): void {
    this.check(context, context.union!.name.value, context.union!.name);
  }
  visitEnum(context: Context): void {
    this.check(context, context.enum!.name.value, context.enum!.name);
  }
  visitAlias(context: Context): void {
    this.check(context, context.alias!.name.value, context.alias!.name);
  }
  private check(context: Context, name: string, node: Node): void {
    if (this.typeNames.has(name)) {
      context.reportError(validationError(node, `duplicate object "${name}"`));
    } else {
      this.typeNames.add(name);
    }
  }
}
