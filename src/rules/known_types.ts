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

import {
  AbstractVisitor,
  Context,
  Kind,
  ListType,
  MapType,
  Named,
  Optional,
  Type,
} from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

const builtInTypeNames = new Set([
  "i8",
  "u8",
  "i16",
  "u16",
  "i32",
  "u32",
  "i64",
  "u64",
  "f32",
  "f64",
  "bool",
  "string",
  "datetime",
  "bytes",
  "any",
  "value",
]);

export class KnownTypes extends AbstractVisitor {
  visitAlias(context: Context): void {
    const alias = context.alias!;
    this.checkType(context, `alias`, alias.name.value, alias.type);
  }

  visitFunctionAfter(context: Context): void {
    this.handleOperation(context);
  }

  visitOperationAfter(context: Context): void {
    this.handleOperation(context);
  }

  handleOperation(context: Context): void {
    const oper = context.operation!;
    // "void" is a special case for operations without a return.
    if (
      oper.type.isKind(Kind.Named) &&
      (oper.type as Named).name.value == "void"
    ) {
      return;
    }
    this.checkType(
      context,
      `return`,
      oper.name.value,
      oper.type, // return type
    );
  }
  visitParameter(context: Context): void {
    const oper = context.operation!;
    const param = context.parameter!;
    this.checkType(
      context,
      `parameter "${param.name.value}"`,
      `${oper.name.value}`,
      param.type,
    );
  }

  visitTypeField(context: Context): void {
    const type = context.type!;
    const field = context.field!;
    this.checkType(
      context,
      `field "${field.name.value}"`,
      `${type.name.value}`,
      field.type,
    );
  }

  visitUnion(context: Context): void {
    const union = context.union!;
    union.members.forEach((t) => {
      this.checkType(
        context,
        `union "${union.name.value}"`,
        `${union.name.value}`,
        t.type,
      );
    });
  }

  visitDirectiveParameter(context: Context): void {
    const directive = context.directive!;
    const param = context.parameter!;
    this.checkType(
      context,
      `parameter "${param.name.value}"`,
      `${directive.name.value}`,
      param.type,
    );
  }

  private checkType(
    context: Context,
    forName: string,
    parentName: string,
    t: Type,
  ) {
    switch (t.getKind()) {
      case Kind.Named: {
        const named = t as Named;
        const name = named.name.value;
        const first = name.charAt(0);

        if (first === first.toLowerCase()) {
          // Check for built-in types
          if (!builtInTypeNames.has(name)) {
            context.reportError(
              validationError(
                named,
                `invalid built-in type "${named.name.value}" for ${forName} in "${parentName}"`,
              ),
            );
          }
        } else {
          // Check against defined types
          if (!context.allTypes.has(name)) {
            context.reportError(
              validationError(
                named,
                `unknown type "${named.name.value}" for ${forName} in "${parentName}"`,
              ),
            );
          }
        }
        break;
      }

      case Kind.Optional: {
        const optional = t as Optional;
        this.checkType(context, forName, parentName, optional.type);
        break;
      }

      case Kind.MapType: {
        const map = t as MapType;
        this.checkType(context, forName, parentName, map.keyType);
        this.checkType(context, forName, parentName, map.valueType);
        break;
      }

      case Kind.ListType: {
        const list = t as ListType;
        this.checkType(context, forName, parentName, list.type);
        break;
      }
    }
  }
}
