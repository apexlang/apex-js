/*
Copyright 2022 The Apex Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { Kind } from "./kinds.js";
import { AbstractNode } from "./nodes.js";
import { Location } from "./location.js";
import { Definition } from "./definitions.js";
import { Context, Visitor } from "./visitor.js";

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

    visitor.visitFunctionsBefore(context);
    context.functions.map((func) => {
      func.accept(context.clone({ operation: func }), visitor);
    });
    visitor.visitFunctionsAfter(context);

    visitor.visitInterfacesBefore(context);
    context.interfaces.map((iface) => {
      iface.accept(context.clone({ interface: iface }), visitor);
    });
    visitor.visitInterfacesAfter(context);

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
