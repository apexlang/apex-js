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

import { Kind } from "../ast/kinds.ts";
import { AbstractVisitor, Context, ImportDefinition } from "../ast/mod.ts";
import { Named, Type } from "../ast/types.ts";
import { validationError } from "../error/mod.ts";

export class ValidImportAliases extends AbstractVisitor {
  private parentName = "";

  public override visitEnum(context: Context): void {
    this.parentName = context.enum!.name.value;
  }

  public override visitTypeField(context: Context): void {
    this.checkImportAlias(context, context.field!.type);
  }

  public override visitTypeSpread(context: Context): void {
    this.checkImportAlias(context, context.spread!.type);
  }

  private checkImportAlias(context: Context, type: Type) {
    if (type.getKind() !== Kind.Named) {
      return;
    }

    const named = type as Named;
    if (!named.importAlias) {
      return;
    }

    const exists = context.document!.definitions.find((v) =>
      v.getKind() == Kind.ImportDefinition &&
      (v as ImportDefinition).as.value == named.importAlias!.value
    );
    if (!exists) {
      context.reportError(
        validationError(
          named,
          `"${named.importAlias.value}" is not imported`,
        ),
      );
    }
  }
}
