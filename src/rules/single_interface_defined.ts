import { AbstractVisitor, Context, Node } from "../ast/index.js";
import { validationError } from "../error/index.js";

export class SingleInterfaceDefined extends AbstractVisitor {
  private found: boolean = false;

  visitInterface(context: Context): void {
    if (this.found) {
      const iface = context.interface!;
      context.reportError(
        validationError(iface, `only one interface can be defined`)
      );
    }
    this.found = true;
  }
}
