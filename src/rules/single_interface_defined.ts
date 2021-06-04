import { AbstractVisitor, Context, Node } from "../ast";
import { validationError } from "../error";

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
