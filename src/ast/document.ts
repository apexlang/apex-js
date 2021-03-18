import { kinds } from "./kinds";
import { AbstractNode } from "./node";
import { Location } from "./location";
import { Definition } from "./definitions";
import { Context, Visitor } from "./visitor";

export class Document extends AbstractNode {
  definitions: Definition[];

  constructor(loc: Location | undefined, definitions: Definition[]) {
    super(kinds.Document, loc);
    this.definitions = definitions;
  }

  public accept(context: Context, visitor: Visitor): void {
    context = new Context(context.config, this);
    visitor.visitDocumentBefore(context);

    context.namespace.accept(context, visitor);

    visitor.visitAllOperationsBefore(context);
    context.interface.accept(context, visitor);

    visitor.visitRolesBefore(context);
    context.roles!.map((role) => {
      role.accept(context.clone({ role: role }), visitor);
    });
    visitor.visitRolesAfter(context);
    visitor.visitAllOperationsAfter(context);

    visitor.visitObjectsBefore(context);
    context.objects!.map((object) => {
      object.accept(context.clone({ object: object }), visitor);
    });
    visitor.visitObjectsAfter(context);

    visitor.visitDocumentAfter(context);
  }
}
