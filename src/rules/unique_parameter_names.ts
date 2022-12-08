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

import { AbstractVisitor, Context } from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

export class UniqueParameterNames extends AbstractVisitor {
  private parentName = "";
  private paramNames: Set<string> = new Set<string>();

  visitFunctionBefore(context: Context): void {
    this.parentName = `func "${context.operation!.name.value}"`;
    this.paramNames = new Set<string>();
  }

  visitOperationBefore(context: Context): void {
    this.parentName = `operation "${context.operation!.name.value}"`;
    this.parentName = context.operation!.name.value;
    this.paramNames = new Set<string>();
  }

  visitParameter(context: Context): void {
    const param = context.parameter!;
    const paramName = param.name.value;
    if (this.paramNames.has(paramName)) {
      context.reportError(
        validationError(
          param.name,
          `duplicate parameter "${paramName}" in ${this.parentName}`,
        ),
      );
    } else {
      this.paramNames.add(paramName);
    }
  }
}
