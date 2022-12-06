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

import { AbstractVisitor, Context, Node } from "../ast/index.ts";
import { validationError } from "../error/index.ts";
import { camelCase } from "./case.ts";

export class CamelCaseDirectiveNames extends AbstractVisitor {
  visitDirective(context: Context): void {
    const directive = context.directive!;
    const name = directive.name.value;
    if (name != camelCase(name)) {
      context.reportError(
        validationError(
          directive.name,
          `directive "${name}" should be camel case`
        )
      );
    }
  }
}
