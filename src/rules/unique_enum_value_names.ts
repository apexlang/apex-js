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

import { AbstractVisitor, Context } from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

export class UniqueEnumValueNames extends AbstractVisitor {
  private parentName = "";
  private names: Set<string> = new Set<string>();

  public override visitEnum(context: Context): void {
    this.parentName = context.enum!.name.value;
    this.names = new Set<string>();
  }
  public override visitEnumValue(context: Context): void {
    const enumValue = context.enumValue!;
    const name = enumValue.name.value;
    if (this.names.has(name)) {
      context.reportError(
        validationError(
          enumValue.name,
          `duplicate value name "${name}" in enum "${this.parentName}"`,
        ),
      );
    } else {
      this.names.add(name);
    }
  }
}
