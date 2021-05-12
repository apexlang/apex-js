import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

export class UniqueOperationNames extends AbstractVisitor {
  private parentName: string = "";
  private operationNames: Set<string> = new Set<string>();

  visitInterfaceBefore(context: Context): void {
    this.parentName = "interface";
    this.operationNames = new Set<string>();
  }
  visitRoleBefore(context: Context): void {
    this.parentName = `role "${context.role!.name.value}"`;
    this.operationNames = new Set<string>();
  }
  visitOperation(context: Context): void {
    const oper = context.operation!;
    const operName = oper.name.value;
    if (this.operationNames.has(operName)) {
      context.reportError(
        validationError(
          oper.name,
          `duplicate operation "${operName}" in ${this.parentName}`
        )
      );
    } else {
      this.operationNames.add(operName);
    }
  }
}
