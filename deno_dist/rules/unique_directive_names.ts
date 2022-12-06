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

import { AbstractVisitor, Context } from "../ast/index.ts";
import { validationError } from "../error/index.ts";

export class UniqueDirectiveNames extends AbstractVisitor {
  private names: Set<string> = new Set<string>();

  visitDirective(context: Context): void {
    const dir = context.directive!;
    const dirName = dir.name.value;
    if (this.names.has(dirName)) {
      context.reportError(
        validationError(dir.name, `duplicate directive "${dirName}"`)
      );
    } else {
      this.names.add(dirName);
    }
  }
}
