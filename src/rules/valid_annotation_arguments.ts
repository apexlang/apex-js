import {
  AbstractVisitor,
  Annotation,
  Argument,
  Context,
  Kind,
  ListType,
  ListValue,
  Named,
  ObjectValue,
  Type,
  Value,
  MapType,
  Optional,
  TypeDefinition,
  EnumDefinition,
  EnumValue,
  FieldDefinition,
  IntValue,
} from "../ast";
import { validationError } from "../error";

const integerBuiltInTypeNames = new Set([
  "i8",
  "u8",
  "i16",
  "u16",
  "i32",
  "u32",
  "i64",
  "u64",
]);

const floatBuiltInTypeNames = new Set(["f32", "f64"]);

export class ValidAnnotationArguments extends AbstractVisitor {
  visitAnnotation(context: Context): void {
    const a = context.annotation!;
    const dir = context.directiveMap.get(a.name.value);
    if (dir == undefined) {
      return;
    }

    let args = new Map<string, Argument>();
    a.arguments.map((arg) => args.set(arg.name.value, arg));

    for (let param of dir.parameters) {
      const arg = args.get(param.name.value);
      if (arg == undefined) {
        if (!param.type.isKind(Kind.Optional)) {
          context.reportError(
            validationError(
              a,
              `missing required argument "${param.name.value}" in annotation "${a.name.value}"`
            )
          );
        }
        continue;
      }
      args.delete(param.name.value);

      // Validate types
      this.check(context, param.type, arg.value, a);
    }

    args.forEach((arg) => {
      context.reportError(
        validationError(
          arg,
          `unknown parameter "${arg.name.value}" in directive "${dir.name.value}`
        )
      );
    });
  }

  private check(
    context: Context,
    type: Type,
    value: Value,
    annotation: Annotation
  ) {
    switch (type.getKind()) {
      case Kind.Optional:
        const optional = type as Optional;
        this.check(context, optional.type, value, annotation);
        break;

      case Kind.Named:
        const named = type as Named;
        if (named.name.value == "string") {
          if (!value.isKind(Kind.StringValue)) {
            context.reportError(
              validationError(
                value,
                `invalid value "${value.getValue()}" in annotation "${
                  annotation.name.value
                }": expected a string`
              )
            );
          }
        } else if (integerBuiltInTypeNames.has(named.name.value)) {
          if (!value.isKind(Kind.IntValue)) {
            context.reportError(
              validationError(
                value,
                `invalid value "${value.getValue()}" in annotation "${
                  annotation.name.value
                }": expected a string`
              )
            );
            return;
          }
          const intValue = value as IntValue;
          if (named.name.value.substring(0, 1) == "u" && intValue.value < 0) {
            context.reportError(
              validationError(
                value,
                `invalid value "${intValue.value}" in annotation "${annotation.name.value}": expected a non-negative integer`
              )
            );
          }
        } else if (floatBuiltInTypeNames.has(named.name.value)) {
          if (!value.isKind(Kind.FloatValue)) {
            context.reportError(
              validationError(
                value,
                `invalid value "${value.getValue()}" in annotation "${
                  annotation.name.value
                }": expected a float`
              )
            );
          }
        } else if (named.name.value == "bool") {
          if (!value.isKind(Kind.BooleanValue)) {
            context.reportError(
              validationError(
                value,
                `invalid value "${value.getValue()}" in annotation "${
                  annotation.name.value
                }": expected a boolean`
              )
            );
          }
        } else {
          const definition = context.allTypes.get(named.name.value);
          if (definition == undefined) {
            // error reported by KnownTypes
            return;
          }
          if (definition.isKind(Kind.EnumDefinition)) {
            if (!value.isKind(Kind.EnumValue)) {
              context.reportError(
                validationError(
                  value,
                  `invalid value "${value.getValue()}" in annotation "${
                    annotation.name.value
                  }": expected an enum value`
                )
              );
              return;
            }
            const expectedEnumValue = value as EnumValue;
            const enumDef = definition as EnumDefinition;
            const enumValue = enumDef.values.filter((enumValue) => {
              return expectedEnumValue.value === enumValue.name.value;
            });
            if (enumValue.length < 1) {
              context.reportError(
                validationError(
                  value,
                  `unknown enum value "${expectedEnumValue.value}" in annotation "${annotation.name.value}": expected value from "${enumDef.name.value}"`
                )
              );
            }
          } else if (definition.isKind(Kind.TypeDefinition)) {
            if (!value.isKind(Kind.ObjectValue)) {
              context.reportError(
                validationError(
                  value,
                  `invalid value "${value.getValue()}" in annotation "${
                    annotation.name.value
                  }": expected an object`
                )
              );
              return;
            }
            const type = definition as TypeDefinition;
            const obj = value as ObjectValue;

            let fields = new Map<string, FieldDefinition>();
            type.fields.map((field) => fields.set(field.name.value, field));

            for (let field of obj.fields) {
              const f = fields.get(field.name.value);
              if (f == undefined) {
                context.reportError(
                  validationError(
                    field.name,
                    `unknown field "${field.name.value}" for type "${type.name.value}" in annotation "${annotation.name.value}"`
                  )
                );
                continue;
              }
              fields.delete(field.name.value);

              // Validate types
              this.check(context, f.type, field.value, annotation);
            }
            fields.forEach((field, name) => {
              if (!field.type.isKind(Kind.Optional)) {
                context.reportError(
                  validationError(
                    obj,
                    `missing required field "${field.name.value}" for type "${type.name.value}" in annotation "${annotation.name.value}"`
                  )
                );
              }
            });
          } else {
            context.reportError(
              validationError(
                value,
                `invalid value "${value.getValue()}" in annotation "${
                  annotation.name.value
                }": expected an object`
              )
            );
          }
        }
        break;

      case Kind.ListType:
        const list = type as ListType;
        if (!value.isKind(Kind.ListValue)) {
          context.reportError(
            validationError(
              value,
              `invalid value "${value.getValue()}" in annotation "${
                annotation.name.value
              }": expected a list`
            )
          );
          return;
        }
        const listValue = value as ListValue;
        for (let value of listValue.value) {
          this.check(context, list.type, value, annotation);
        }
        break;

      case Kind.MapType:
        const map = type as MapType;
        if (!value.isKind(Kind.ObjectValue)) {
          context.reportError(
            validationError(
              value,
              `invalid value "${value.getValue()}" in annotation "${
                annotation.name.value
              }": expected a map`
            )
          );
          return;
        }
        const objectValue = value as ObjectValue;
        for (let field of objectValue.fields) {
          this.check(context, map.valueType, field.value, annotation);
        }
        break;
    }
  }
}
