/*
Copyright 2024 The Apex Authors.

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

import { AbstractVisitor, Context } from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

const validLocationNames = new Set([
  "NAMESPACE",
  "INTERFACE",
  "OPERATION",
  "PARAMETER",
  "TYPE",
  "FIELD",
  "ENUM",
  "ENUM_VALUE",
  "UNION",
  "ALIAS",
]);

export class ValidDirectiveLocations extends AbstractVisitor {
  visitDirective(context: Context): void {
    const dir = context.directive!;
    const dirName = dir.name.value;
    const locationNames = new Set<string>();

    for (const loc of dir.locations) {
      if (!validLocationNames.has(loc.value)) {
        context.reportError(
          validationError(
            loc,
            `invalid directive location "${loc.value}" on "${dirName}"`,
          ),
        );
      }
      if (locationNames.has(loc.value)) {
        context.reportError(
          validationError(
            loc,
            `duplicate directive location "${loc.value}" on "${dirName}"`,
          ),
        );
      }
      locationNames.add(loc.value);
    }

    for (const req of dir.requires) {
      const requireLocationNames = new Set<string>();
      for (const loc of req.locations) {
        if (loc.value != "SELF" && !validLocationNames.has(loc.value)) {
          context.reportError(
            validationError(
              loc,
              `invalid directive location "${loc.value}" on "${dirName}"`,
            ),
          );
        }
        if (requireLocationNames.has(loc.value)) {
          context.reportError(
            validationError(
              loc,
              `duplicate directive location "${loc.value}" on "${dirName}"`,
            ),
          );
        }
        requireLocationNames.add(loc.value);
      }
    }
  }
}
