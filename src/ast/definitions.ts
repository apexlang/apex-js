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
import { IntValue, StringValue, Value } from "./values.js";
import {
  AbstractNode,
  Name,
  Annotation,
  DirectiveRequire,
  ImportName,
} from "./nodes.js";
import { Named, Type } from "./types.js";
import { Location } from "./location.js";
import { Context, Visitor } from "./visitor.js";

export interface Definition {
  getKind(): Kind;
  isKind(kind: Kind): boolean;
  getLoc(): Location | undefined;
  imported: boolean;
}

export interface Annotated {
  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined;
}

export class NamespaceDefinition extends AbstractNode implements Annotated {
  name: Name;
  description?: StringValue;
  annotations: Annotation[];

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    annotations?: Annotation[]
  ) {
    super(Kind.NamespaceDefinition, loc);
    this.description = desc;
    this.name = name;
    this.annotations = annotations || [];
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitNamespace(context);
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class AliasDefinition extends AbstractNode implements Annotated {
  name: Name;
  description?: StringValue;
  type: Type;
  annotations: Annotation[];

  constructor(
    loc: Location | undefined,
    name: Name,
    description: StringValue | undefined,
    type: Type,
    annotations?: Annotation[]
  ) {
    super(Kind.AliasDefinition, loc);
    this.name = name;
    this.description = description;
    this.type = type;
    this.annotations = annotations || [];
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitAlias(context);
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class ImportDefinition extends AbstractNode implements Annotated {
  description?: StringValue;
  all: boolean;
  names: ImportName[];
  from: StringValue;
  annotations?: Annotation[];

  constructor(
    loc: Location | undefined,
    description: StringValue | undefined,
    all: boolean,
    names: ImportName[],
    from: StringValue,
    annotations?: Annotation[]
  ) {
    super(Kind.ImportDefinition, loc);
    this.description = description;
    this.all = all;
    this.names = names;
    this.from = from;
    this.annotations = annotations || [];
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitImport(context);
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class TypeDefinition extends AbstractNode implements Annotated {
  name: Name;
  description?: StringValue;
  interfaces: Named[];
  annotations: Annotation[];
  fields: FieldDefinition[];

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    interfaces: Named[],
    annotations: Annotation[],
    fields: FieldDefinition[]
  ) {
    super(Kind.TypeDefinition, loc);
    this.name = name;
    this.description = desc;
    this.interfaces = interfaces;
    this.annotations = annotations;
    this.fields = fields;
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitTypeBefore(context);
    visitor.visitType(context);

    context = context.clone({ fields: context.type!.fields });
    visitor.visitTypeFieldsBefore(context);
    context.fields!.map((field, index) => {
      field.accept(context.clone({ field: field, fieldIndex: index }), visitor);
    });
    visitor.visitTypeFieldsAfter(context);

    visitAnnotations(context, visitor, this.annotations);
    visitor.visitTypeAfter(context);
  }
}

export abstract class ValuedDefinition
  extends AbstractNode
  implements Annotated
{
  name: Name;
  description?: StringValue;
  type: Type;
  default?: Value;
  annotations: Annotation[];

  constructor(
    kind: Kind,
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    type: Type,
    defaultVal: Value | undefined,
    annotations: Annotation[]
  ) {
    super(kind, loc);
    this.name = name;
    this.description = desc;
    this.type = type;
    this.default = defaultVal;
    this.annotations = annotations;
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }
}

export class FieldDefinition extends ValuedDefinition {
  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    type: Type,
    defaultVal: Value | undefined,
    annotations: Annotation[]
  ) {
    super(Kind.FieldDefinition, loc, name, desc, type, defaultVal, annotations);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitTypeField(context);
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class InterfaceDefinition
  extends AbstractNode
  implements Definition, Annotated
{
  name: Name;
  description?: StringValue;
  operations: OperationDefinition[];
  annotations: Annotation[];

  constructor(
    loc: Location | undefined,
    name: Name,
    desc?: StringValue,
    op?: OperationDefinition[],
    annotations?: Annotation[]
  ) {
    super(Kind.InterfaceDefinition, loc);
    this.name = name;
    this.description = desc;
    this.operations = op || [];
    this.annotations = annotations || [];
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitInterfaceBefore(context);
    visitor.visitInterface(context);

    context = context.clone({ operations: context.interface!.operations });
    visitor.visitOperationsBefore(context);
    context.operations!.map((operation) => {
      operation.accept(context.clone({ operation: operation }), visitor);
    });
    visitor.visitOperationsAfter(context);

    visitAnnotations(context, visitor, this.annotations);
    visitor.visitInterfaceAfter(context);
  }
}

export class OperationDefinition extends AbstractNode implements Annotated {
  name: Name;
  description: StringValue | undefined;
  parameters: ParameterDefinition[];
  type: Type;
  annotations: Annotation[];
  unary: boolean;

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    type: Type,
    annotations: Annotation[],
    unary: boolean,
    parameters: ParameterDefinition[]
  ) {
    super(Kind.OperationDefinition, loc);
    this.name = name;
    this.description = desc;
    this.type = type;
    this.annotations = annotations;
    this.parameters = parameters;
    this.unary = unary;
  }

  public isUnary(): boolean {
    return this.unary && this.parameters && this.parameters.length == 1;
  }

  public unaryOp(): ParameterDefinition {
    return this.parameters[0];
  }

  mapTypeToTranslation(
    typeTranslation: (inp: Type) => string
  ): Map<String, String> {
    const mp = new Map<String, String>();
    if (this.unary) {
      mp.set(this.unaryOp().name.value, typeTranslation(this.unaryOp().type));
    } else {
      this.parameters.forEach((arg) => {
        mp.set(arg.name.value, typeTranslation(arg.type));
      });
    }
    return mp;
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    if (context.interface != undefined) {
      visitor.visitOperationBefore(context);
      visitor.visitOperation(context);
    } else {
      visitor.visitFunctionBefore(context);
      visitor.visitFunction(context);
    }

    context = context.clone({ parameters: context.operation!.parameters });
    visitor.visitParametersBefore(context);
    context.parameters!.map((parameter, index) => {
      parameter.accept(
        context.clone({ parameter: parameter, parameterIndex: index }),
        visitor
      );
    });
    visitor.visitParametersAfter(context);

    visitAnnotations(context, visitor, this.annotations);
    if (context.interface) {
      visitor.visitOperationAfter(context);
    } else {
      visitor.visitFunctionAfter(context);
    }
  }
}

export class ParameterDefinition extends ValuedDefinition {
  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    type: Type,
    defaultVal: Value | undefined,
    annotations: Annotation[]
  ) {
    super(
      Kind.ParameterDefinition,
      loc,
      name,
      desc,
      type,
      defaultVal,
      annotations
    );
  }

  public accept(context: Context, visitor: Visitor): void {
    if (context.operation != undefined) {
      visitor.visitParameter(context);
    } else if (context.directive != undefined) {
      visitor.visitDirectiveParameter(context);
    }
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class UnionDefinition
  extends AbstractNode
  implements Definition, Annotated
{
  name: Name;
  description?: StringValue;
  annotations: Annotation[];
  types: Type[];

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    annotations: Annotation[],
    types: Type[]
  ) {
    super(Kind.UnionDefinition, loc);
    this.name = name;
    this.description = desc;
    this.annotations = annotations;
    this.types = types;
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitUnion(context);
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class EnumDefinition
  extends AbstractNode
  implements Definition, Annotated
{
  name: Name;
  description?: StringValue;
  annotations: Annotation[];
  values: EnumValueDefinition[];

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    annotations: Annotation[],
    values: EnumValueDefinition[]
  ) {
    super(Kind.EnumDefinition, loc);
    this.name = name;
    this.description = desc;
    this.annotations = annotations;
    this.values = values;
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitEnumBefore(context);
    visitor.visitEnum(context);

    context = context.clone({ enumValues: context.enum!.values });
    visitor.visitEnumValuesBefore(context);
    context.enumValues!.map((enumValue) => {
      enumValue.accept(context.clone({ enumValue: enumValue }), visitor);
    });
    visitor.visitEnumValuesAfter(context);

    visitAnnotations(context, visitor, this.annotations);
    visitor.visitEnumAfter(context);
  }
}

export class EnumValueDefinition
  extends AbstractNode
  implements Definition, Annotated
{
  name: Name;
  description?: StringValue;
  annotations: Annotation[];
  index: IntValue;
  display?: StringValue;

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    index: IntValue,
    display: StringValue | undefined,
    annotations: Annotation[]
  ) {
    super(Kind.EnumValueDefinition, loc);
    this.name = name;
    this.index = index;
    this.display = display;
    this.description = desc;

    this.annotations = annotations;
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitEnumValue(context);
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class DirectiveDefinition extends AbstractNode implements Definition {
  name: Name;
  description?: StringValue;
  parameters: ParameterDefinition[];
  locations: Name[];
  requires: DirectiveRequire[];

  constructor(
    loc: Location | undefined,
    name: Name,
    description: StringValue | undefined,
    parameters: ParameterDefinition[],
    locations: Name[],
    requires?: DirectiveRequire[]
  ) {
    super(Kind.DirectiveDefinition, loc);
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.locations = locations;
    this.requires = requires || [];
  }

  public hasLocation(location: string): boolean {
    for (let l of this.locations) {
      if (l.value == location) {
        return true;
      }
    }
    return false;
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitDirectiveBefore(context);
    visitor.visitDirective(context);

    context = context.clone({ parameters: context.directive!.parameters });
    visitor.visitDirectiveParametersBefore(context);
    context.parameters!.map((parameter, index) => {
      parameter.accept(
        context.clone({ parameter: parameter, parameterIndex: index }),
        visitor
      );
    });
    visitor.visitDirectiveParametersAfter(context);

    visitor.visitDirectiveAfter(context);
  }
}

function visitAnnotations(
  context: Context,
  visitor: Visitor,
  annotations?: Annotation[]
) {
  if (annotations == undefined) {
    return;
  }

  visitor.visitAnnotationsBefore(context);
  annotations!.map((annotation) => {
    const c = context.clone({ annotation: annotation });
    visitor.visitAnnotationBefore(c);
    annotation.accept(c, visitor);
    visitor.visitAnnotationAfter(c);
  });
  visitor.visitAnnotationsAfter(context);
}

function getAnnotation(
  name: string,
  annotations?: Annotation[],
  callback?: (annotation: Annotation) => void
): Annotation | undefined {
  if (annotations == undefined) {
    return undefined;
  }
  for (let a of annotations!) {
    if (a.name.value === name) {
      if (callback != undefined) {
        callback(a);
      }
      return a;
    }
  }
  return undefined;
}
