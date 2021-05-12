import { AbstractVisitor, Context } from "../ast";
import { validationError } from "../error";

export class UniqueEnumValueNames extends AbstractVisitor {
  private parentName: string = "";
  private names: Set<string> = new Set<string>();

  visitEnum(context: Context): void {
    this.parentName = context.enum!.name.value;
    this.names = new Set<string>();
  }
  visitEnumValue(context: Context): void {
    const enumValue = context.enumValue!;
    const name = enumValue.name.value;
    if (this.names.has(name)) {
      context.reportError(
        validationError(
          enumValue.name,
          `duplicate value name "${name}" in enum "${this.parentName}"`
        )
      );
    } else {
      this.names.add(name);
    }
  }
}
