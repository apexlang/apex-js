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

import { AbstractVisitor, Context, Kind, Node } from "../ast/index.js";
import { validationError } from "../error/index.js";

export class NamespaceFirst extends AbstractVisitor {
  visitNamespace(context: Context): void {
    var firstNonImportPos = 0;
    const definitions = context.document!.definitions;
    for (let i = 0; i < definitions.length; i++) {
      const def = definitions[i];
      if (!def.imported && !def.isKind(Kind.ImportDefinition)) {
        firstNonImportPos = i;
        break;
      }
    }
    if (context.namespacePos != firstNonImportPos) {
      context.reportError(
        validationError(
          context.namespace,
          `namespace must be defined before any other definition`
        )
      );
    }
  }
}
