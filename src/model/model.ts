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

import {
  AliasDefinition,
  Annotation as AnnotationDef,
  Argument as ArgumentDef,
  DirectiveDefinition,
  DirectiveRequire,
  EnumDefinition,
  EnumValueDefinition,
  FieldDefinition,
  InterfaceDefinition,
  NamespaceDefinition,
  OperationDefinition,
  ParameterDefinition,
  TypeDefinition,
  UnionDefinition,
  UnionMemberDefinition,
  Value,
  ValuedDefinition,
} from "../ast/mod.ts";
import { Kind } from "./kinds.ts";
import { Context, Visitor } from "./visitor.ts";
import {
  ListType as ASTListType,
  MapType as ASTMapType,
  Optional as ASTOptional,
  Type as ASTType,
} from "../ast/mod.ts";

class Base {
  readonly kind: Kind;

  constructor(kind: Kind) {
    this.kind = kind;
  }
}

export enum PrimitiveName {
  ID = "ID",
  String = "string",
  U8 = "u8",
  U16 = "u16",
  U32 = "u32",
  U64 = "u64",
  I8 = "i8",
  I16 = "i16",
  I32 = "i32",
  I64 = "i64",
  F32 = "f32",
  F64 = "f64",
  DateTime = "datetime",
  Bool = "bool",
  Bytes = "bytes",
  Any = "any",
  Value = "value",
}

export class Void extends Base {
  constructor() {
    super(Kind.Void);
  }
}

export const VoidValue: Void = new Void();

export interface Named {
  readonly name: string;
}

export class Primitive extends Base {
  readonly name: PrimitiveName;

  constructor(name: PrimitiveName) {
    super(Kind.Primitive);
    this.name = name;
  }
}

export const primitives: { [name: string]: Primitive } = {
  ID: new Primitive(PrimitiveName.ID),
  string: new Primitive(PrimitiveName.String),
  u8: new Primitive(PrimitiveName.U8),
  u16: new Primitive(PrimitiveName.U16),
  u32: new Primitive(PrimitiveName.U32),
  u64: new Primitive(PrimitiveName.U64),
  i8: new Primitive(PrimitiveName.I8),
  i16: new Primitive(PrimitiveName.I16),
  i32: new Primitive(PrimitiveName.I32),
  i64: new Primitive(PrimitiveName.I64),
  f32: new Primitive(PrimitiveName.F32),
  f64: new Primitive(PrimitiveName.F64),
  datetime: new Primitive(PrimitiveName.DateTime),
  bool: new Primitive(PrimitiveName.Bool),
  bytes: new Primitive(PrimitiveName.Bytes),
  any: new Primitive(PrimitiveName.Any),
  value: new Primitive(PrimitiveName.Value),
};

export class List extends Base {
  readonly type: AnyType;

  constructor(tr: TypeResolver, def: ASTListType) {
    super(Kind.List);
    this.type = tr(def.type);
  }
}

export class Map extends Base {
  readonly keyType: AnyType;
  readonly valueType: AnyType;

  constructor(tr: TypeResolver, def: ASTMapType) {
    super(Kind.Map);
    this.keyType = tr(def.keyType);
    this.valueType = tr(def.valueType);
  }
}

export class Optional extends Base {
  readonly type: AnyType;

  constructor(tr: TypeResolver, def: ASTOptional) {
    super(Kind.Optional);
    this.type = tr(def.type);
  }
}

export class Stream extends Base {
  type: AnyType;

  constructor(tr: TypeResolver, def: ASTOptional) {
    super(Kind.Stream);
    this.type = tr(def.type);
  }
}

export type AnyType =
  | Primitive
  | Alias
  | Type
  | Union
  | Enum
  | List
  | Map
  | Optional
  | Stream
  | Void
  | Interface;

export abstract class Annotated extends Base {
  readonly annotations: Annotation[];

  constructor(kind: Kind, annotations: AnnotationDef[]) {
    super(kind);
    this.annotations = annotations.map((v) => new Annotation(v));
  }

  annotation(
    name: string,
    callback?: (annotation: Annotation) => void,
  ): Annotation | undefined {
    return getAnnotation(name, this.annotations, callback);
  }
}

export type TypeResolver = (name: ASTType) => AnyType;

export class Namespace extends Annotated {
  readonly node: NamespaceDefinition;
  readonly name: string;
  readonly description?: string;

  readonly directives: { [name: string]: Directive };
  readonly aliases: { [name: string]: Alias };
  readonly functions: { [name: string]: Operation };
  readonly interfaces: { [name: string]: Interface };
  readonly types: { [name: string]: Type };
  readonly enums: { [name: string]: Enum };
  readonly unions: { [name: string]: Union };
  readonly allTypes: { [name: string]: AnyType };

  constructor(_tr: TypeResolver, node: NamespaceDefinition) {
    super(Kind.Namespace, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    this.directives = {};
    this.functions = {};
    this.interfaces = {};
    this.types = {};
    this.enums = {};
    this.unions = {};
    this.aliases = {};
    this.allTypes = {};
  }

  public accept(context: Context, visitor: Visitor): void {
    context = context.clone({ namespace: this });
    visitor.visitNamespaceBefore(context);
    visitor.visitNamespace(context);

    visitor.visitDirectivesBefore(context);
    for (const name in this.directives) {
      const item = this.directives[name];
      item.accept(context.clone({ directive: item }), visitor);
    }
    visitor.visitDirectivesAfter(context);

    visitor.visitAliasesBefore(context);
    for (const name in this.aliases) {
      const item = this.aliases[name];
      if (!item.annotation("novisit")) {
        item.accept(context.clone({ alias: item }), visitor);
      }
    }
    visitor.visitAliasesAfter(context);

    visitor.visitAllOperationsBefore(context);

    visitor.visitFunctionsBefore(context);
    for (const name in this.functions) {
      const item = this.functions[name];
      item.accept(context.clone({ operation: item }), visitor);
    }
    visitor.visitFunctionsAfter(context);

    visitor.visitInterfacesBefore(context);
    for (const name in this.interfaces) {
      const item = this.interfaces[name];
      item.accept(context.clone({ interface: item }), visitor);
    }
    visitor.visitInterfacesAfter(context);

    visitor.visitAllOperationsAfter(context);

    visitor.visitTypesBefore(context);
    for (const name in this.types) {
      const item = this.types[name];
      if (!item.annotation("novisit")) {
        item.accept(context.clone({ type: item }), visitor);
      }
    }
    visitor.visitTypesAfter(context);

    visitor.visitUnionsBefore(context);
    for (const name in this.unions) {
      const item = this.unions[name];
      if (!item.annotation("novisit")) {
        item.accept(context.clone({ union: item }), visitor);
      }
    }
    visitor.visitUnionsAfter(context);

    visitor.visitEnumsBefore(context);
    for (const name in this.enums) {
      const item = this.enums[name];
      if (!item.annotation("novisit")) {
        item.accept(context.clone({ enumDef: item }), visitor);
      }
    }
    visitor.visitEnumsAfter(context);

    visitor.visitNamespaceAfter(context);
  }
}

export class Alias extends Annotated implements Named {
  readonly node: AliasDefinition;
  readonly name: string;
  readonly description?: string;
  readonly type: AnyType;

  constructor(
    tr: TypeResolver,
    node: AliasDefinition,
    register?: (a: Alias) => void,
  ) {
    super(Kind.Alias, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    if (register) {
      register(this);
    }
    this.type = tr(node.type);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitAliasBefore(context);
    visitor.visitAlias(context);
    visitor.visitAliasAfter(context);
  }
}

export class Type extends Annotated implements Named {
  readonly node: TypeDefinition;
  readonly name: string;
  readonly description?: string;
  readonly fields: Field[];

  constructor(
    tr: TypeResolver,
    node: TypeDefinition,
    register?: (a: Type) => void,
  ) {
    super(Kind.Type, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    if (register) {
      register(this);
    }
    this.fields = node.fields.map((v) => new Field(tr, v));
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitTypeBefore(context);
    visitor.visitType(context);

    context = context.clone({ fields: this.fields });
    visitor.visitTypeFieldsBefore(context);
    context.fields!.map((field, index) => {
      field.accept(context.clone({ field: field, fieldIndex: index }), visitor);
    });
    visitor.visitTypeFieldsAfter(context);
    visitor.visitTypeAfter(context);
  }
}

export abstract class Valued extends Annotated implements Named {
  readonly name: string;
  readonly description?: string;
  readonly type: AnyType;
  readonly default?: Value;

  constructor(tr: TypeResolver, kind: Kind, node: ValuedDefinition) {
    super(kind, node.annotations);
    this.name = node.name.value;
    this.description = node.description?.value;
    this.default = node.default;
    this.type = tr(node.type);
  }
}

export class Field extends Valued {
  readonly node: FieldDefinition;

  constructor(tr: TypeResolver, node: FieldDefinition) {
    super(tr, Kind.Field, node);
    this.node = node;
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitTypeField(context);
  }
}

export class Interface extends Annotated implements Named {
  readonly node: InterfaceDefinition;
  readonly name: string;
  readonly description?: string;
  readonly operations: Operation[];

  constructor(
    tr: TypeResolver,
    node: InterfaceDefinition,
    register?: (r: Interface) => void,
  ) {
    super(Kind.Interface, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    if (register) {
      register(this);
    }
    this.operations = node.operations.map((v) => new Operation(tr, v));
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitInterfaceBefore(context);
    visitor.visitInterface(context);

    context = context.clone({ operations: this.operations });
    visitor.visitOperationsBefore(context);
    context.operations!.map((operation) => {
      operation.accept(context.clone({ operation: operation }), visitor);
    });

    visitor.visitOperationsAfter(context);
    visitor.visitInterfaceAfter(context);
  }
}

export class Operation extends Annotated implements Named {
  readonly node: OperationDefinition;
  readonly name: string;
  readonly description?: string;
  readonly parameters: Parameter[];
  readonly type: AnyType;
  readonly unary: boolean;

  constructor(
    tr: TypeResolver,
    node: OperationDefinition,
    register?: (r: Operation) => void,
  ) {
    super(Kind.Operation, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    if (register) {
      register(this);
    }
    this.parameters = node.parameters.map((v) => new Parameter(tr, v));
    this.type = tr(node.type);
    this.unary = node.unary;
  }

  public isUnary(): boolean {
    return this.unary && this.parameters && this.parameters.length == 1;
  }

  public unaryOp(): Parameter {
    return this.parameters[0];
  }

  public accept(context: Context, visitor: Visitor): void {
    if (context.interface) {
      visitor.visitOperationBefore(context);
      visitor.visitOperation(context);
    } else {
      visitor.visitFunctionBefore(context);
      visitor.visitFunction(context);
    }

    context = context.clone({ parameters: this.parameters });
    visitor.visitParametersBefore(context);
    context.parameters.map((parameter, index) => {
      parameter.accept(
        context.clone({ parameter: parameter, parameterIndex: index }),
        visitor,
      );
    });
    visitor.visitParametersAfter(context);

    if (context.interface) {
      visitor.visitOperationAfter(context);
    } else {
      visitor.visitFunctionAfter(context);
    }
  }
}

export class Parameter extends Valued {
  readonly node: ParameterDefinition;

  constructor(tr: TypeResolver, node: ParameterDefinition) {
    super(tr, Kind.Parameter, node);
    this.node = node;
  }

  public accept(context: Context, visitor: Visitor): void {
    if (context.operation != undefined) {
      visitor.visitParameter(context);
    } else if (context.directive != undefined) {
      visitor.visitDirectiveParameter(context);
    }
  }
}

export class Union extends Annotated implements Named {
  readonly node: UnionDefinition;
  readonly name: string;
  readonly description?: string;
  readonly members: UnionMember[];

  constructor(
    tr: TypeResolver,
    node: UnionDefinition,
    register?: (a: Union) => void,
  ) {
    super(Kind.Union, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    if (register) {
      register(this);
    }
    this.members = node.members.map((v) => new UnionMember(tr, v));
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitUnion(context);
  }
}

export class UnionMember extends Annotated {
  readonly node: UnionMemberDefinition;
  readonly description?: string;
  readonly type: AnyType;

  constructor(tr: TypeResolver, node: UnionMemberDefinition) {
    super(Kind.EnumValue, node.annotations);
    this.node = node;
    this.description = node.description?.value;
    this.type = tr(node.type);
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitEnumValue(context);
  }
}

export class Enum extends Annotated implements Named {
  readonly node: EnumDefinition;
  readonly name: string;
  readonly description?: string;
  readonly values: EnumValue[];

  constructor(
    tr: TypeResolver,
    node: EnumDefinition,
    register?: (e: Enum) => void,
  ) {
    super(Kind.Enum, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    if (register) {
      register(this);
    }
    this.values = node.values.map((v) => new EnumValue(tr, v));
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitEnumBefore(context);
    visitor.visitEnum(context);

    context = context.clone({ enumValues: this.values });
    visitor.visitEnumValuesBefore(context);
    context.enumValues!.map((enumValue) => {
      enumValue.accept(context.clone({ enumValue: enumValue }), visitor);
    });

    visitor.visitEnumValuesAfter(context);
    visitor.visitEnumAfter(context);
  }
}

export class EnumValue extends Annotated implements Named {
  readonly node: EnumValueDefinition;
  readonly name: string;
  readonly description?: string;
  readonly index: number;
  readonly display?: string;

  constructor(_tr: TypeResolver, node: EnumValueDefinition) {
    super(Kind.EnumValue, node.annotations);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    this.index = node.index.value;
    this.display = node.display?.value;
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitEnumValue(context);
  }
}

export class Directive extends Base implements Named {
  readonly node: DirectiveDefinition;
  readonly name: string;
  readonly description?: string;
  readonly parameters: Parameter[];
  readonly locations: string[];
  readonly requires: Require[];

  constructor(
    tr: TypeResolver,
    node: DirectiveDefinition,
    register?: (r: Directive) => void,
  ) {
    super(Kind.Directive);
    this.node = node;
    this.name = node.name.value;
    this.description = node.description?.value;
    if (register) {
      register(this);
    }
    this.parameters = node.parameters.map((v) => new Parameter(tr, v));
    this.locations = node.locations.map((v) => v.value);
    this.requires = node.requires.map((v) => new Require(tr, v));
  }

  public hasLocation(location: string): boolean {
    for (const l of this.locations) {
      if (l == location) {
        return true;
      }
    }
    return false;
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitDirectiveBefore(context);
    visitor.visitDirective(context);

    context = context.clone({ parameters: this.parameters });
    visitor.visitDirectiveParametersBefore(context);
    context.parameters!.map((parameter, index) => {
      parameter.accept(
        context.clone({ parameter: parameter, parameterIndex: index }),
        visitor,
      );
    });

    visitor.visitDirectiveParametersAfter(context);
    visitor.visitDirectiveAfter(context);
  }
}

export class Require extends Base {
  readonly node: DirectiveRequire;
  readonly directive: string;
  readonly locations: string[];

  constructor(_tr: TypeResolver, node: DirectiveRequire) {
    super(Kind.Require);
    this.node = node;
    this.directive = node.directive.value;
    this.locations = node.locations.map((v) => v.value);
  }

  public hasLocation(location: string): boolean {
    for (const l of this.locations) {
      if (l == location) {
        return true;
      }
    }
    return false;
  }
}

export class Annotation extends Base implements Named {
  readonly node: AnnotationDef;
  readonly name: string;
  readonly arguments: Argument[];

  constructor(node: AnnotationDef) {
    super(Kind.Annotation);
    this.node = node;
    this.name = node.name.value;
    this.arguments = node.arguments.map((v) => new Argument(v));
  }

  convert<T>(): T {
    // deno-lint-ignore no-explicit-any
    const obj: { [k: string]: any } = {};
    this.arguments.map((arg) => {
      obj[arg.name] = arg.value.getValue();
    });
    return obj as T;
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitAnnotation(context);
  }
}

export class Argument extends Base implements Named {
  readonly node: ArgumentDef;
  readonly name: string;
  readonly value: Value;

  constructor(node: ArgumentDef) {
    super(Kind.Argument);
    this.node = node;
    this.name = node.name.value;
    this.value = node.value;
  }
}

function getAnnotation(
  name: string,
  annotations?: Annotation[],
  callback?: (annotation: Annotation) => void,
): Annotation | undefined {
  if (annotations == undefined) {
    return undefined;
  }
  for (const a of annotations!) {
    if (a.name === name) {
      if (callback != undefined) {
        callback(a);
      }
      return a;
    }
  }
  return undefined;
}
