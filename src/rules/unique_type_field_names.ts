import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

export class UniqueTypeFieldNames extends AbstractVisitor {
  private parentName: string = "";
  private names: Set<string> = new Set<string>();

  visitTypeBefore(context: Context): void {
    this.parentName = context.type!.name.value;
    this.names = new Set<string>();
  }

  visitTypeField(context: Context): void {
    const field = context.field!;
    const fieldName = field.name.value;
    if (this.names.has(fieldName)) {
      context.reportError(
        validationError(
          field.name,
          `duplicate field "${fieldName}" in type "${this.parentName}"`
        )
      );
    } else {
      this.names.add(fieldName);
    }
  }
}
