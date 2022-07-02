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

import { AbstractVisitor, Context, Node } from "../ast/index.js";
import { validationError } from "../error/index.js";

export class UniqueObjectNames extends AbstractVisitor {
  private typeNames: Set<string> = new Set<string>();

  visitNamespace(context: Context): void {
    this.typeNames = new Set<string>();
  }
  visitRole(context: Context): void {
    this.check(context, context.role!.name.value, context.role!.name);
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
  private check(context: Context, name: string, node: Node): void {
    if (this.typeNames.has(name)) {
      context.reportError(validationError(node, `duplicate object "${name}"`));
    } else {
      this.typeNames.add(name);
    }
  }
}
