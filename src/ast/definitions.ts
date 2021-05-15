import { Kind } from "./kinds";
import { IntValue, StringValue, Value } from "./values";
import {
  AbstractNode,
  Name,
  Annotation,
  DirectiveRequire,
  ImportName,
} from "./nodes";
import { Named, Type } from "./types";
import { Location } from "./location";
import { Context, Visitor } from "./visitor";

export interface Definition {
  getKind(): Kind;
  isKind(kind: Kind): boolean;
  getLoc(): Location | undefined;
}

// DescribableNode are nodes that have descriptions associated with them.
export interface DescribableNode {
  getDescription(): StringValue;
}

export interface TypeDefinition extends DescribableNode {
  getKind(): Kind;
  getLoc(): Location;
}

export interface TypeSystemDefinition {
  getKind(): Kind;
  getLoc(): Location;
}

export class NamespaceDefinition extends AbstractNode {
  description?: StringValue;
  name: Name;
  annotations: Annotation[];

  constructor(
    loc: Location | undefined,
    desc: StringValue | undefined,
    name: Name,
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

export class ImportDefinition extends AbstractNode {
  description?: StringValue;
  all: boolean;
  names: ImportName[];
  from: Name;
  annotations?: Annotation[];

  constructor(
    loc: Location | undefined,
    desc: StringValue | undefined,
    all: boolean,
    names: ImportName[],
    from: Name,
    annotations?: Annotation[]
  ) {
    super(Kind.ImportDefinition, loc);
    this.description = desc;
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

export class TypeDefinition extends AbstractNode {
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

export class OperationDefinition extends AbstractNode {
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
    parameters: ParameterDefinition[],
    type: Type,
    annotations: Annotation[],
    unary: boolean
  ) {
    super(Kind.OperationDefinition, loc);
    this.name = name;
    this.description = desc;
    this.parameters = parameters;
    this.type = type;
    this.annotations = annotations;
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
    visitor.visitOperationBefore(context);
    visitor.visitOperation(context);

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
    visitor.visitOperationAfter(context);
  }
}

export abstract class ValuedDefinition extends AbstractNode {
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
    directives: Annotation[]
  ) {
    super(Kind.FieldDefinition, loc, name, desc, type, defaultVal, directives);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitTypeField(context);
    visitAnnotations(context, visitor, this.annotations);
  }
}

export class ParameterDefinition extends ValuedDefinition {
  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    type: Type,
    defaultVal: Value | undefined,
    directives: Annotation[]
  ) {
    super(
      Kind.ParameterDefinition,
      loc,
      name,
      desc,
      type,
      defaultVal,
      directives
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

export class InterfaceDefinition extends AbstractNode implements Definition {
  description?: StringValue;
  operations: OperationDefinition[];
  annotations: Annotation[];

  constructor(
    loc?: Location,
    desc?: StringValue,
    op?: OperationDefinition[],
    annotations?: Annotation[]
  ) {
    super(Kind.InterfaceDefinition, loc);
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

    context = context.clone({ operations: context.interface.operations });
    visitor.visitOperationsBefore(context);
    context.operations!.map((operation) => {
      operation.accept(context.clone({ operation: operation }), visitor);
    });
    visitor.visitOperationsAfter(context);

    visitAnnotations(context, visitor, this.annotations);
    visitor.visitInterfaceAfter(context);
  }
}

export class RoleDefinition extends AbstractNode implements Definition {
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
    super(Kind.RoleDefinition, loc);
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
    visitor.visitRoleBefore(context);
    visitor.visitRole(context);

    context = context.clone({ operations: context.role!.operations });
    visitor.visitOperationsBefore(context);
    context.operations!.map((operation) => {
      operation.accept(context.clone({ operation: operation }), visitor);
    });
    visitor.visitOperationsAfter(context);

    visitAnnotations(context, visitor, this.annotations);
    visitor.visitRoleAfter(context);
  }
}

export class UnionDefinition extends AbstractNode implements Definition {
  name: Name;
  description?: StringValue;
  annotations: Annotation[];
  types: Named[];

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    annotations: Annotation[],
    types: Named[]
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

export class EnumDefinition extends AbstractNode implements Definition {
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
    visitor.visitEnum(context);

    context = context.clone({ enumValues: context.enum!.values });
    visitor.visitEnumValuesBefore(context);
    context.enumValues!.map((enumValue) => {
      enumValue.accept(context.clone({ enumValue: enumValue }), visitor);
    });
    visitor.visitEnumValuesAfter(context);

    visitAnnotations(context, visitor, this.annotations);
  }
}

export class EnumValueDefinition extends AbstractNode implements Definition {
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
