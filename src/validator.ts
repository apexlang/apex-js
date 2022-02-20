import { Context, Document, MultiVisitor } from "./ast";
import { ApexError } from "./error";
import { ValidationRule } from "./rules";

export function validate(
  doc: Document,
  ...rules: ValidationRule[]
): ApexError[] {
  const context = new Context({});

  const ruleVisitors = rules.map((r) => new r());
  const visitor = new MultiVisitor(...ruleVisitors);

  doc.accept(context, visitor);
  return context.getErrors();
}
