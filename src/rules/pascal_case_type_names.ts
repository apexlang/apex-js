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

import { AbstractVisitor, Context } from "../ast/index.ts";
import { validationError } from "../error/index.ts";

const pascalMatcher = /[A-Z][A-Za-z0-9]*/;

export class PascalCaseTypeNames extends AbstractVisitor {
  visitAlias(context: Context): void {
    const alias = context.alias!;
    const name = alias.name.value;
    if (!pascalMatcher.test(name)) {
      context.reportError(
        validationError(alias.name, `alias "${name}" should be pascal case`)
      );
    }
  }

  visitType(context: Context): void {
    const type = context.type!;
    const name = type.name.value;
    if (!pascalMatcher.test(name)) {
      context.reportError(
        validationError(type.name, `type "${name}" should be pascal case`)
      );
    }
  }

  visitEnum(context: Context): void {
    const enumDef = context.enum!;
    const name = enumDef.name.value;
    if (!pascalMatcher.test(name)) {
      context.reportError(
        validationError(enumDef.name, `enum "${name}" should be pascal case`)
      );
    }
  }

  visitUnion(context: Context): void {
    const union = context.union!;
    const name = union.name.value;
    if (!pascalMatcher.test(name)) {
      context.reportError(
        validationError(union.name, `union "${name}" should be pascal case`)
      );
    }
  }
}
