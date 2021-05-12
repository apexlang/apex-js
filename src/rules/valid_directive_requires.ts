import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

const validLocationNames = new Set([
  "NAMESPACE",
  "INTERFACE",
  "ROLE",
  "OPERATION",
  "PARAMETER",
  "TYPE",
  "FIELD",
  "ENUM",
  "ENUM_VALUE",
  "UNION",
]);

export class ValidDirectiveRequires extends AbstractVisitor {
  visitDirective(context: Context): void {
    const dir = context.directive!;
    const dirName = dir.name.value;

    for (let req of dir.requires) {
      if (!context.directiveMap.has(req.directive.value)) {
        context.reportError(
          validationError(
            req.directive,
            `unknown required directive "${req.directive.value}" on "${dirName}"`
          )
        );
      }
    }
  }
}
