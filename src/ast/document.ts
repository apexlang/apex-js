import { Kind } from "./kinds";
import { AbstractNode } from "./nodes";
import { Location } from "./location";
import { Definition } from "./definitions";
import { Context, Visitor } from "./visitor";

export class Document extends AbstractNode {
  definitions: Definition[];

  constructor(loc: Location | undefined, definitions: Definition[]) {
    super(Kind.Document, loc);
    this.definitions = definitions;
  }

  public accept(context: Context, visitor: Visitor): void {
    context = new Context(context.config, this, context);
    visitor.visitDocumentBefore(context);

    context.namespaces.map((namespace) => {
      namespace.accept(context.clone({ namespace: namespace }), visitor);
    });

    visitor.visitImportsBefore(context);
    context.imports.map((importDef) => {
      importDef.accept(context.clone({ importDef: importDef }), visitor);
    });
    visitor.visitImportsAfter(context);

    visitor.visitDirectivesBefore(context);
    context.directives.map((directive) => {
      directive.accept(context.clone({ directive: directive }), visitor);
    });
    visitor.visitDirectivesAfter(context);

    visitor.visitAliasesBefore(context);
    context.aliases.map((alias) => {
      alias.accept(context.clone({ alias: alias }), visitor);
    });
    visitor.visitAliasesAfter(context);

    visitor.visitAllOperationsBefore(context);
    context.interfaces.map((iface) => {
      iface.accept(context.clone({ interfaceDef: iface }), visitor);
    });

    visitor.visitRolesBefore(context);
    context.roles.map((role) => {
      role.accept(context.clone({ role: role }), visitor);
    });
    visitor.visitRolesAfter(context);
    visitor.visitAllOperationsAfter(context);

    visitor.visitTypesBefore(context);
    context.types.map((type) => {
      if (!type.annotation("novisit")) {
        type.accept(context.clone({ type: type }), visitor);
      }
    });
    visitor.visitTypesAfter(context);

    visitor.visitUnionsBefore(context);
    context.unions.map((union) => {
      union.accept(context.clone({ union: union }), visitor);
    });
    visitor.visitUnionsAfter(context);

    visitor.visitEnumsBefore(context);
    context.enums.map((enumDef) => {
      if (!enumDef.annotation("novisit")) {
        enumDef.accept(context.clone({ enumDef: enumDef }), visitor);
      }
    });
    visitor.visitEnumsAfter(context);

    visitor.visitDocumentAfter(context);
  }
}
