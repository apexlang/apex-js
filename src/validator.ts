import { Context, Document, MultiVisitor } from "./ast/index.js";
import { ApexError } from "./error/index.js";
import { ValidationRule } from "./rules/index.js";

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
