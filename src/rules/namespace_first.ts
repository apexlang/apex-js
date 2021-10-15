import { AbstractVisitor, Context, Kind, Node } from "../ast";
import { validationError } from "../error";

export class NamespaceFirst extends AbstractVisitor {
  visitNamespace(context: Context): void {
    var firstNonImportPos = 0;
    const definitions = context.document!.definitions;
    for (let i = 0; i < definitions.length; i++) {
      const def = definitions[i];
      if (!def.imported && !def.isKind(Kind.ImportDefinition)) {
        firstNonImportPos = i;
        break;
      }
    }
    if (context.namespacePos != firstNonImportPos) {
      context.reportError(
        validationError(
          context.namespace,
          `namespace must be defined before any other definition`
        )
      );
    }
  }
}
