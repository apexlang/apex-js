import { AbstractVisitor, Context } from "../ast/index.js";
import { validationError } from "../error/index.js";

export class UniqueDirectiveNames extends AbstractVisitor {
  private names: Set<string> = new Set<string>();

  visitDirective(context: Context): void {
    const dir = context.directive!;
    const dirName = dir.name.value;
    if (this.names.has(dirName)) {
      context.reportError(
        validationError(dir.name, `duplicate directive "${dirName}"`)
      );
    } else {
      this.names.add(dirName);
    }
  }
}
