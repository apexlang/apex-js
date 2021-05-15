import {
  AbstractVisitor,
  Context,
  Type,
  Named,
  Kind,
  Optional,
  MapType,
  ListType,
} from "../ast";
import { validationError } from "../error";

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
  "raw",
]);

export class KnownTypes extends AbstractVisitor {
  visitOperationBefore(context: Context): void {
    const oper = context.operation!;
  }
  visitOperationAfter(context: Context): void {
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
      oper.type // return type
    );
  }
  visitParameter(context: Context): void {
    const oper = context.operation!;
    const param = context.parameter!;
    this.checkType(
      context,
      `parameter "${param.name.value}"`,
      `${oper.name.value}`,
      param.type
    );
  }

  visitTypeField(context: Context): void {
    const type = context.type!;
    const field = context.field!;
    this.checkType(
      context,
      `field "${field.name.value}"`,
      `${type.name.value}`,
      field.type
    );
  }

  visitDirectiveParameter(context: Context): void {
    const directive = context.directive!;
    const param = context.parameter!;
    this.checkType(
      context,
      `parameter "${param.name.value}"`,
      `${directive.name.value}`,
      param.type
    );
  }

  private checkType(
    context: Context,
    forName: string,
    parentName: string,
    t: Type
  ) {
    switch (t.getKind()) {
      case Kind.Named:
        const named = t as Named;
        const name = named.name.value;
        var first = name.charAt(0);

        if (first === first.toLowerCase()) {
          // Check for built-in types
          if (!builtInTypeNames.has(name)) {
            context.reportError(
              validationError(
                named,
                `invalid built-in type "${named.name.value}" for ${forName} in "${parentName}"`
              )
            );
          }
        } else {
          // Check against defined types
          if (!context.allTypes.has(name)) {
            context.reportError(
              validationError(
                named,
                `unknown type "${named.name.value}" for ${forName} in "${parentName}"`
              )
            );
          }
        }
        break;

      case Kind.Optional:
        const optional = t as Optional;
        this.checkType(context, forName, parentName, optional.type);
        break;

      case Kind.MapType:
        const map = t as MapType;
        this.checkType(context, forName, parentName, map.keyType);
        this.checkType(context, forName, parentName, map.valueType);
        break;

      case Kind.ListType:
        const list = t as ListType;
        this.checkType(context, forName, parentName, list.type);
        break;
    }
  }
}
