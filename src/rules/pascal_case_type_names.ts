import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

const pascalMatcher = /[A-Z][0-9A-Za-z]/;

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
