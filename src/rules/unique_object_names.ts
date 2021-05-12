import { AbstractVisitor, Context, Node } from "../ast";
import { validationError } from "../error";

export class UniqueObjectNames extends AbstractVisitor {
  private typeNames: Set<string> = new Set<string>();

  visitNamespace(context: Context): void {
    this.typeNames = new Set<string>();
  }
  visitRole(context: Context): void {
    this.check(context, context.role!.name.value, context.role!.name);
  }
  visitType(context: Context): void {
    this.check(context, context.type!.name.value, context.type!.name);
  }
  visitUnion(context: Context): void {
    this.check(context, context.union!.name.value, context.union!.name);
  }
  visitEnum(context: Context): void {
    this.check(context, context.enum!.name.value, context.enum!.name);
  }
  private check(context: Context, name: string, node: Node): void {
    if (this.typeNames.has(name)) {
      context.reportError(validationError(node, `duplicate object "${name}"`));
    } else {
      this.typeNames.add(name);
    }
  }
}
