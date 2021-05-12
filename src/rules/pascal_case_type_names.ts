import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

const pascalMatcher = /[A-Z][0-9A-Za-z]/;

export class PascalCaseTypeNames extends AbstractVisitor {
  visitType(context: Context): void {
    const type = context.type!;
    const name = type.name.value;
    if (!pascalMatcher.test(name)) {
      context.reportError(
        validationError(type.name, `type "${name}" should be pascal case`)
      );
    }
  }
}
