import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

export class UniqueParameterNames extends AbstractVisitor {
  private parentName: string = "";
  private paramNames: Set<string> = new Set<string>();

  visitOperationBefore(context: Context): void {
    this.parentName = context.operation!.name.value;
    this.paramNames = new Set<string>();
  }
  visitParameter(context: Context): void {
    const param = context.parameter!;
    const paramName = param.name.value;
    if (this.paramNames.has(paramName)) {
      context.reportError(
        validationError(
          param.name,
          `duplicate parameter "${paramName}" in operation "${this.parentName}"`
        )
      );
    } else {
      this.paramNames.add(paramName);
    }
  }
}
