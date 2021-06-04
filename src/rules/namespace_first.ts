import { AbstractVisitor, Context, Node } from "../ast";
import { validationError } from "../error";

export class NamespaceFirst extends AbstractVisitor {
  visitNamespace(context: Context): void {
    if (context.namespacePos != 0) {
      context.reportError(
        validationError(
          context.namespace,
          `namespace must be defined before any other definition`
        )
      );
    }
  }
}
