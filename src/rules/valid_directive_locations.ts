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
  "ALIAS",
]);

export class ValidDirectiveLocations extends AbstractVisitor {
  visitDirective(context: Context): void {
    const dir = context.directive!;
    const dirName = dir.name.value;
    const locationNames = new Set<string>();

    for (let loc of dir.locations) {
      if (!validLocationNames.has(loc.value)) {
        context.reportError(
          validationError(
            loc,
            `invalid directive location "${loc.value}" on "${dirName}"`
          )
        );
      }
      if (locationNames.has(loc.value)) {
        context.reportError(
          validationError(
            loc,
            `duplicate directive location "${loc.value}" on "${dirName}"`
          )
        );
      }
      locationNames.add(loc.value);
    }

    for (let req of dir.requires) {
      const requireLocationNames = new Set<string>();
      for (let loc of req.locations) {
        if (loc.value != "SELF" && !validLocationNames.has(loc.value)) {
          context.reportError(
            validationError(
              loc,
              `invalid directive location "${loc.value}" on "${dirName}"`
            )
          );
        }
        if (requireLocationNames.has(loc.value)) {
          context.reportError(
            validationError(
              loc,
              `duplicate directive location "${loc.value}" on "${dirName}"`
            )
          );
        }
        requireLocationNames.add(loc.value);
      }
    }
  }
}
