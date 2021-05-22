import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

export class ValidEnumValueIndexes extends AbstractVisitor {
  private parentName: string = "";

  visitEnum(context: Context): void {
    this.parentName = context.enum!.name.value;
  }
  visitEnumValue(context: Context): void {
    const enumValue = context.enumValue!;
    const value = enumValue.index.value;
    if (isNaN(value) || value < 0) {
      context.reportError(
        validationError(
          enumValue.index,
          `value index "${enumValue.index.value}" in enum "${this.parentName}" must be a non-negative integer`
        )
      );
    }
  }
}
