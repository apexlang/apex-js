import {
  AbstractVisitor,
  Context,
  Type,
  Kind,
  DirectiveDefinition,
  Optional,
  MapType,
  ListType,
  Named,
} from "../ast";
import { validationError } from "../error";

const validTypes = new Set([Kind.TypeDefinition, Kind.EnumDefinition]);

export class ValidDirectiveParameterTypes extends AbstractVisitor {
  visitDirectiveParameter(context: Context): void {
    const dir = context.directive!;
    const param = context.parameter!;
    this.check(context, dir, param.type);
  }

  private check(context: Context, dir: DirectiveDefinition, type: Type) {
    switch (true) {
      case type.isKind(Kind.Optional):
        const optional = type as Optional;
        this.check(context, dir, optional.type);
        break;

      case type.isKind(Kind.Named):
        const named = type as Named;
        const typeDef = context.allTypes.get(named.name.value);
        if (typeDef == undefined) {
          return;
        }

        if (!validTypes.has(typeDef.getKind())) {
          context.reportError(
            validationError(
              type,
              `invalid type used in directive "${dir.name.value}": only Types, Enums and built-in types are allowed`
            )
          );
        }
        break;

      case type.isKind(Kind.ListType):
        const listType = type as ListType;
        this.check(context, dir, listType.type);
        break;

      case type.isKind(Kind.MapType):
        const mapType = type as MapType;
        this.check(context, dir, mapType.valueType);
        break;
    }
  }
}
