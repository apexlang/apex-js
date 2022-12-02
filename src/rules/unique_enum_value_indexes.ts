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

import { AbstractVisitor, Context } from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

export class UniqueEnumValueIndexes extends AbstractVisitor {
  private parentName = "";
  private values: Set<number> = new Set<number>();

  visitEnum(context: Context): void {
    this.parentName = context.enum!.name.value;
    this.values = new Set<number>();
  }
  visitEnumValue(context: Context): void {
    const enumValue = context.enumValue!;
    const value = enumValue.index.value;
    if (this.values.has(value)) {
      context.reportError(
        validationError(
          enumValue.index,
          `duplicate value index "${value}" in enum "${this.parentName}"`,
        ),
      );
    } else {
      this.values.add(value);
    }
  }
}
