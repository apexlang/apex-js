// deno-lint-ignore-file no-unused-vars
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

import { AbstractVisitor, Context, Node } from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

export class SingleNamespaceDefined extends AbstractVisitor {
  private found = false;

  visitNamespace(context: Context): void {
    if (this.found) {
      const namespace = context.namespace;
      context.reportError(
        validationError(namespace, `only one namespace can be defined`),
      );
    }
    this.found = true;
  }
}
