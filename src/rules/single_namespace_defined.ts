import { AbstractVisitor, Context, Node } from "../ast/index.js";
import { validationError } from "../error/index.js";

export class SingleNamespaceDefined extends AbstractVisitor {
  private found: boolean = false;

  visitNamespace(context: Context): void {
    if (this.found) {
      const namespace = context.namespace;
      context.reportError(
        validationError(namespace, `only one namespace can be defined`)
      );
    }
    this.found = true;
  }
}
