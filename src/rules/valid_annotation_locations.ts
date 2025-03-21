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

import { AbstractVisitor, Annotation, Context } from "../ast/mod.ts";
import { validationError } from "../error/mod.ts";

export class ValidAnnotationLocations extends AbstractVisitor {
  public override visitNamespace(context: Context): void {
    const def = context.namespace!;
    this.check(context, def.annotations, "NAMESPACE");
  }

  public override visitInterface(context: Context): void {
    const def = context.interface!;
    this.check(context, def.annotations, "INTERFACE");
  }

  public override visitOperation(context: Context): void {
    const def = context.operation!;
    this.check(context, def.annotations, "OPERATION");
  }

  public override visitParameter(context: Context): void {
    const def = context.parameter!;
    this.check(context, def.annotations, "PARAMETER");
  }

  public override visitType(context: Context): void {
    const def = context.type!;
    this.check(context, def.annotations, "TYPE");
  }

  public override visitTypeField(context: Context): void {
    const def = context.field!;
    this.check(context, def.annotations, "FIELD");
  }

  public override visitEnum(context: Context): void {
    const def = context.enum!;
    this.check(context, def.annotations, "ENUM");
  }

  public override visitEnumValue(context: Context): void {
    const def = context.enumValue!;
    this.check(context, def.annotations, "ENUM_VALUE");
  }

  public override visitUnion(context: Context): void {
    const def = context.union!;
    this.check(context, def.annotations, "UNION");
  }

  public override visitAlias(context: Context): void {
    const alias = context.alias!;
    this.check(context, alias.annotations, "ALIAS");
  }

  private check(context: Context, annotations: Annotation[], location: string) {
    for (const annotation of annotations) {
      this.checkAnnotation(context, annotations, annotation, location);
    }
  }

  private checkAnnotation(
    context: Context,
    annotations: Annotation[],
    annotation: Annotation,
    location: string,
  ) {
    const dir = context.directiveMap.get(annotation.name.value);
    if (dir == undefined) {
      return;
    }
    let found = false;
    for (const loc of dir.locations) {
      if (loc.value == location) {
        found = true;
        break;
      }
    }
    if (!found) {
      context.reportError(
        validationError(
          annotation,
          `annotation "${annotation.name.value}" is not valid on a ${
            location
              .toLowerCase()
              .replace("_", " ")
          }`,
        ),
      );
      return;
    }

    dirRequiresLoop: for (const req of dir.requires) {
      let found = false;
      for (const loc of req.locations) {
        switch (loc.value) {
          case "SELF":
            if (findAnnotation(req.directive.value, annotations)) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "NAMESPACE":
            if (
              findAnnotation(req.directive.value, context.namespace.annotations)
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "INTERFACE":
            if (
              context.interface != undefined &&
              findAnnotation(
                req.directive.value,
                context.interface!.annotations,
              )
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "PARAMETER":
            if (
              context.parameter != undefined &&
              findAnnotation(
                req.directive.value,
                context.parameter!.annotations,
              )
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "TYPE":
            if (
              context.type != undefined &&
              findAnnotation(req.directive.value, context.type!.annotations)
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "FIELD":
            if (
              context.field != undefined &&
              findAnnotation(req.directive.value, context.field!.annotations)
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "ENUM":
            if (
              context.enum != undefined &&
              findAnnotation(req.directive.value, context.enum!.annotations)
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "ENUM_VALUE":
            if (
              context.enumValue != undefined &&
              findAnnotation(
                req.directive.value,
                context.enumValue!.annotations,
              )
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "UNION":
            if (
              context.union != undefined &&
              findAnnotation(req.directive.value, context.union!.annotations)
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
          case "ALIAS":
            if (
              context.alias != undefined &&
              findAnnotation(req.directive.value, context.alias!.annotations)
            ) {
              found = true;
              break dirRequiresLoop;
            }
            break;
        }
      }
      if (!found) {
        const locations = req.locations
          .map((l) => l.value.toLowerCase().replace("_", " "))
          .join(", ");
        context.reportError(
          validationError(
            annotation,
            `annotation "${annotation.name.value}" requires "${req.directive.value}" to exist on relative ${locations}`,
          ),
        );
      }
    }
  }
}

function findAnnotation(name: string, annotations: Annotation[]): boolean {
  for (const annotation of annotations) {
    if (annotation.name.value == name) {
      return true;
    }
  }

  return false;
}
