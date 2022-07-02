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

import { AbstractVisitor, Context } from "../ast/index.js";
import { validationError } from "../error/index.js";

const validLocationNames = new Set([
  "NAMESPACE",
  "INTERFACE",
  "ROLE",
  "OPERATION",
  "PARAMETER",
  "TYPE",
  "FIELD",
  "ENUM",
  "ENUM_VALUE",
  "UNION",
  "ALIAS",
]);

export class ValidDirectiveRequires extends AbstractVisitor {
  visitDirective(context: Context): void {
    const dir = context.directive!;
    const dirName = dir.name.value;

    for (let req of dir.requires) {
      if (!context.directiveMap.has(req.directive.value)) {
        context.reportError(
          validationError(
            req.directive,
            `unknown required directive "${req.directive.value}" on "${dirName}"`
          )
        );
      }
    }
  }
}
