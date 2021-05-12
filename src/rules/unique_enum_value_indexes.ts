import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

export class UniqueEnumValueIndexes extends AbstractVisitor {
  private parentName: string = "";
  private values: Set<number> = new Set<number>();

  visitEnum(context: Context): void {
    this.parentName = context.enum!.name.value;
    this.values = new Set<number>();
  }
  visitEnumValue(context: Context): void {
    const enumValue = context.enumValue!;
    const value = enumValue.index.value;
    if (this.values.has(value)) {
      context.reportError(
        validationError(
          enumValue.index,
          `duplicate value index "${value}" in enum "${this.parentName}"`
        )
      );
    } else {
      this.values.add(value);
    }
  }
}
