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

import {
  AbstractVisitor,
  Context,
  DirectiveDefinition,
  Kind,
  ListType,
  MapType,
  Named,
  Optional,
  Type,
} from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

const validTypes = new Set([Kind.TypeDefinition, Kind.EnumDefinition]);

export class ValidDirectiveParameterTypes extends AbstractVisitor {
  public override visitDirectiveParameter(context: Context): void {
    const dir = context.directive!;
    const param = context.parameter!;
    this.check(context, dir, param.type);
  }

  private check(context: Context, dir: DirectiveDefinition, type: Type) {
    switch (type.getKind()) {
      case Kind.Optional: {
        const optional = type as Optional;
        this.check(context, dir, optional.type);
        break;
      }

      case Kind.Named: {
        const named = type as Named;
        const typeDef = context.allTypes.get(named.name.value);
        if (typeDef == undefined) {
          return;
        }

        if (!validTypes.has(typeDef.getKind())) {
          context.reportError(
            validationError(
              type,
              `invalid type used in directive "${dir.name.value}": only Types, Enums and built-in types are allowed`,
            ),
          );
        }
        break;
      }

      case Kind.ListType: {
        const listType = type as ListType;
        this.check(context, dir, listType.type);
        break;
      }

      case Kind.MapType: {
        const mapType = type as MapType;
        this.check(context, dir, mapType.valueType);
        break;
      }
    }
  }
}
