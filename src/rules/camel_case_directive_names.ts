import { AbstractVisitor, Context, Node } from "../ast/index.js";
import { validationError } from "../error/index.js";
import { camelCase } from "./case.js";

export class CamelCaseDirectiveNames extends AbstractVisitor {
  visitDirective(context: Context): void {
    const directive = context.directive!;
    const name = directive.name.value;
    if (name != camelCase(name)) {
      context.reportError(
        validationError(
          directive.name,
          `directive "${name}" should be camel case`
        )
      );
    }
  }
}
