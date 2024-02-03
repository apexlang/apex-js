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
  Alias,
  AnyType,
  Directive,
  Enum,
  EnumValue,
  Field,
  Interface,
  List,
  Map,
  Namespace,
  Operation,
  Optional,
  Parameter,
  primitives,
  Stream,
  Type as MObject,
  Union,
  VoidValue,
} from "./model.ts";
import {
  AliasDefinition,
  Annotation,
  DirectiveDefinition,
  Document,
  EnumDefinition,
  InterfaceDefinition,
  Name,
  Named,
  NamespaceDefinition,
  OperationDefinition,
  TypeDefinition,
  UnionDefinition,
} from "../ast/mod.ts";
import autoBind from "../auto-bind.ts";
import { ApexError } from "../error/mod.ts";
import { Kind } from "../ast/mod.ts";
import {
  Kind as ASTKind,
  ListType as ASTListType,
  MapType as ASTMapType,
  Optional as ASTOptional,
  Stream as ASTStream,
  Type as ASTType,
} from "../ast/mod.ts";

export class Writer {
  private code = "";

  write(source: string) {
    this.code += source;
  }

  string(): string {
    return this.code;
  }
}

// deno-lint-ignore no-explicit-any
export type ObjectMap<T = any> = { [key: string]: T };

interface NamedParameters {
  namespace?: Namespace;
  directive?: Directive;
  alias?: Alias;
  interface?: Interface;
  type?: MObject;
  operations?: Operation[];
  operation?: Operation;
  parameters?: Parameter[];
  parameter?: Parameter;
  parameterIndex?: number;
  fields?: Field[];
  field?: Field;
  fieldIndex?: number;
  enumDef?: Enum;
  enumValues?: EnumValue[];
  enumValue?: EnumValue;
  union?: Union;
  annotation?: Annotation;
}

class ErrorHolder {
  errors: ApexError[];

  constructor() {
    this.errors = new Array<ApexError>();
  }

  reportError(error: ApexError): void {
    this.errors.push(error);
  }
}

function dummyValue<T>(_fieldName: string): T {
  return undefined as unknown as T;
}

export class Context {
  config: ObjectMap;
  document?: Document;

  // Top-level definitions
  namespaces: Namespace[];

  // Drill-down definitions
  namespace: Namespace;
  namespacePos: number = dummyValue<number>("namespacePos");
  directive: Directive = dummyValue<Directive>("directive");
  alias: Alias = dummyValue<Alias>("alias");
  interface: Interface = dummyValue<Interface>("interface");
  type: MObject = dummyValue<MObject>("type");
  operations: Operation[] = dummyValue<Operation[]>("operations");
  operation: Operation = dummyValue<Operation>("operation");
  parameters: Parameter[] = dummyValue<Parameter[]>("parameters");
  parameter: Parameter = dummyValue<Parameter>("parameter");
  parameterIndex: number = dummyValue<number>("parameterIndex");
  fields: Field[] = dummyValue<Field[]>("fields");
  field: Field = dummyValue<Field>("fields");
  fieldIndex: number = dummyValue<number>("fieldIndex");
  enum: Enum = dummyValue<Enum>("enum");
  enumValues: EnumValue[] = dummyValue<EnumValue[]>("enumValues");
  enumValue: EnumValue = dummyValue<EnumValue>("enumValue");
  union: Union = dummyValue<Union>("union");

  annotations: Annotation[] = dummyValue<Annotation[]>("annotations");
  annotation: Annotation = dummyValue<Annotation>("annotation");

  private errors: ErrorHolder;
  private typeMap: {
    [name: string]:
      | AliasDefinition
      | TypeDefinition
      | UnionDefinition
      | EnumDefinition;
  };

  constructor(config: ObjectMap, document?: Document, other?: Context) {
    this.config = config || {};
    this.namespace = new Namespace(
      this.getType.bind(this),
      new NamespaceDefinition(
        undefined,
        new Name(undefined, "undefined"),
        undefined,
      ),
    );

    if (other != undefined) {
      this.document = other.document;
      this.namespace = other.namespace;
      this.namespaces = other.namespaces;
      // this.annotations = other.annotations;
      // this.annotation = other.annotation;

      this.errors = other.errors;
      this.typeMap = other.typeMap;
    } else {
      this.namespaces = [];
      // this.annotations = [];

      this.errors = new ErrorHolder();
      this.typeMap = {};
    }

    if (this.document == undefined && document != undefined) {
      this.document = document!;
      this.parseDocument();
    } else if (!other) {
      throw new Error("document or context is required");
    }

    autoBind(this);
  }

  clone({
    namespace,
    directive,
    alias,
    interface: iface,
    type,
    operations,
    operation,
    parameters,
    parameter,
    parameterIndex,
    fields,
    field,
    fieldIndex,
    enumDef,
    enumValues,
    enumValue,
    union,
    annotation,
  }: NamedParameters): Context {
    const context = new Context(this.config, undefined, this);

    context.namespace = namespace || this.namespace;
    context.namespacePos = this.namespacePos;
    context.directive = directive || this.directive;
    context.alias = alias || this.alias;
    context.interface = iface || this.interface;
    context.type = type || this.type;
    context.operations = operations || this.operations;
    context.operation = operation || this.operation;
    context.parameters = parameters || this.parameters;
    context.parameter = parameter || this.parameter;
    context.parameterIndex = parameterIndex || this.parameterIndex;
    context.fields = fields || this.fields;
    context.field = field || this.field;
    context.fieldIndex = fieldIndex || this.fieldIndex;
    context.enum = enumDef || this.enum;
    context.enumValues = enumValues || this.enumValues;
    context.enumValue = enumValue || this.enumValue;
    context.union = union || this.union;
    context.annotation = annotation || this.annotation;

    return context;
  }

  private parseDocument() {
    this.document!.definitions.forEach((value, index) => {
      switch (value.getKind()) {
        // There is one namespace per document.
        case Kind.NamespaceDefinition: {
          const namespace = new Namespace(
            this.getType.bind(this),
            value as NamespaceDefinition,
          );
          this.namespaces.push(namespace);
          this.namespace = namespace;
          this.namespacePos = index;
          break;
        }
        case Kind.AliasDefinition: {
          const aliasDef = value as AliasDefinition;
          this.typeMap[aliasDef.name.value] = aliasDef;
          break;
        }
        case Kind.TypeDefinition: {
          const typeDef = value as TypeDefinition;
          this.typeMap[typeDef.name.value] = typeDef;
          break;
        }
        case Kind.EnumDefinition: {
          const enumDef = value as EnumDefinition;
          this.typeMap[enumDef.name.value] = enumDef;
          break;
        }
        case Kind.UnionDefinition: {
          const unionDef = value as UnionDefinition;
          this.typeMap[unionDef.name.value] = unionDef;
          break;
        }
      }
    });

    if (!this.namespace || this.namespace.name == "undefined") {
      throw new Error("namespace not found");
    }

    this.document!.definitions.forEach((value) => {
      switch (value.getKind()) {
        case Kind.AliasDefinition: {
          const aliasDef = value as AliasDefinition;
          if (!this.namespace.allTypes[aliasDef.name.value]) {
            new Alias(this.getType.bind(this), aliasDef, (a: Alias) => {
              this.namespace.aliases[a.name] = a;
              this.namespace.allTypes[a.name] = a;
            });
          }
          break;
        }
        case Kind.TypeDefinition: {
          const typeDef = value as TypeDefinition;
          if (!this.namespace.allTypes[typeDef.name.value]) {
            new MObject(this.getType.bind(this), typeDef, (t: MObject) => {
              this.namespace.types[t.name] = t;
              this.namespace.allTypes[t.name] = t;
            });
          }
          break;
        }
        case Kind.EnumDefinition: {
          const enumDef = value as EnumDefinition;
          if (!this.namespace.allTypes[enumDef.name.value]) {
            new Enum(this.getType.bind(this), enumDef, (e: Enum) => {
              this.namespace.enums[e.name] = e;
              this.namespace.allTypes[e.name] = e;
            });
          }
          break;
        }
        case Kind.UnionDefinition: {
          const unionDef = value as UnionDefinition;
          if (!this.namespace.allTypes[unionDef.name.value]) {
            new Union(this.getType.bind(this), unionDef, (u: Union) => {
              this.namespace.unions[u.name] = u;
              this.namespace.allTypes[u.name] = u;
            });
          }
          break;
        }
      }
    });

    this.document!.definitions.forEach((value) => {
      switch (value.getKind()) {
        case Kind.DirectiveDefinition:
          new Directive(
            this.getType.bind(this),
            value as DirectiveDefinition,
            (d: Directive) => {
              this.namespace.directives[d.name] = d;
            },
          );
          break;
        case Kind.OperationDefinition:
          new Operation(
            this.getType.bind(this),
            value as OperationDefinition,
            (r: Operation) => {
              this.namespace.functions[r.name] = r;
            },
          );
          break;
        case Kind.InterfaceDefinition:
          new Interface(
            this.getType.bind(this),
            value as InterfaceDefinition,
            (r: Interface) => {
              this.namespace.interfaces[r.name] = r;
            },
          );
          break;
      }
    });

    // Reorder all types per the contents of the spec document.
    this.document!.definitions.forEach((value) => {
      switch (value.getKind()) {
        case Kind.AliasDefinition: {
          const aliasDef = value as AliasDefinition;
          const a = this.namespace.aliases[aliasDef.name.value];
          delete this.namespace.aliases[a.name];
          delete this.namespace.allTypes[a.name];
          this.namespace.aliases[a.name] = a;
          this.namespace.allTypes[a.name] = a;
          break;
        }
        case Kind.TypeDefinition: {
          const typeDef = value as TypeDefinition;
          const t = this.namespace.types[typeDef.name.value];
          delete this.namespace.types[t.name];
          delete this.namespace.allTypes[t.name];
          this.namespace.types[t.name] = t;
          this.namespace.allTypes[t.name] = t;
          break;
        }
        case Kind.EnumDefinition: {
          const enumDef = value as EnumDefinition;
          const e = this.namespace.enums[enumDef.name.value];
          delete this.namespace.enums[e.name];
          delete this.namespace.allTypes[e.name];
          this.namespace.enums[e.name] = e;
          this.namespace.allTypes[e.name] = e;
          break;
        }
        case Kind.UnionDefinition: {
          const unionDef = value as UnionDefinition;
          const u = this.namespace.unions[unionDef.name.value];
          delete this.namespace.unions[u.name];
          delete this.namespace.allTypes[u.name];
          this.namespace.unions[u.name] = u;
          this.namespace.allTypes[u.name] = u;
          break;
        }
      }
    });
  }

  reportError(error: ApexError): void {
    this.errors.reportError(error);
  }

  getErrors(): ApexError[] {
    return this.errors.errors;
  }

  getType(t: ASTType): AnyType {
    switch (t.getKind()) {
      case ASTKind.Named: {
        const name = (t as Named).name.value;
        if (name === "void") {
          return VoidValue;
        }

        let namedType = this.namespace.allTypes[name];
        if (namedType) {
          return namedType;
        }

        namedType = primitives[name];
        if (namedType) {
          return namedType;
        }

        const ifaceType = this.namespace.interfaces[name];
        if (ifaceType) {
          return ifaceType;
        }

        const anyTypeDef = this.typeMap[name];
        if (!anyTypeDef) {
          const at = this.lazyLoadType(name);
          if (at) {
            return at;
          }
          throw new Error(`Unknown type ${name}`);
        }

        switch (anyTypeDef.getKind()) {
          case ASTKind.AliasDefinition:
            return new Alias(
              this.getType.bind(this),
              anyTypeDef as AliasDefinition,
              (a: Alias) => {
                this.namespace.aliases[a.name] = a;
                this.namespace.allTypes[a.name] = a;
              },
            );
          case ASTKind.TypeDefinition:
            return new MObject(
              this.getType.bind(this),
              anyTypeDef as TypeDefinition,
              (t: MObject) => {
                this.namespace.types[t.name] = t;
                this.namespace.allTypes[t.name] = t;
              },
            );
          case ASTKind.UnionDefinition:
            return new Union(
              this.getType.bind(this),
              anyTypeDef as UnionDefinition,
              (u: Union) => {
                this.namespace.unions[u.name] = u;
                this.namespace.allTypes[u.name] = u;
              },
            );
          case ASTKind.EnumDefinition:
            return new Enum(
              this.getType.bind(this),
              anyTypeDef as EnumDefinition,
              (e: Enum) => {
                this.namespace.enums[e.name] = e;
                this.namespace.allTypes[e.name] = e;
              },
            );
        }

        break;
      }
      case ASTKind.Optional: {
        const optional = t as ASTOptional;
        return new Optional(this.getType.bind(this), optional);
      }
      case ASTKind.ListType: {
        const list = t as ASTListType;
        return new List(this.getType.bind(this), list);
      }
      case ASTKind.MapType: {
        const map = t as ASTMapType;
        return new Map(this.getType.bind(this), map);
      }
      case ASTKind.Stream: {
        const stream = t as ASTStream;
        return new Stream(this.getType.bind(this), stream);
      }
    }

    throw new Error("could not resolve type: " + t);
  }

  accept(context: Context, visitor: Visitor): void {
    visitor.visitContextBefore(context);
    context.namespaces.map((namespace) => {
      namespace.accept(context.clone({ namespace: namespace }), visitor);
    });
    visitor.visitContextAfter(context);
  }

  lazyLoadType(name: string): AnyType | undefined {
    for (const value of this.document!.definitions) {
      switch (value.getKind()) {
        case Kind.AliasDefinition: {
          const aliasDef = value as AliasDefinition;
          if (
            aliasDef.name.value === name &&
            !this.namespace.allTypes[aliasDef.name.value]
          ) {
            return new Alias(this.getType.bind(this), aliasDef, (a: Alias) => {
              this.namespace.aliases[a.name] = a;
              this.namespace.allTypes[a.name] = a;
            });
          }
          break;
        }
        case Kind.TypeDefinition: {
          const typeDef = value as TypeDefinition;
          if (
            typeDef.name.value === name &&
            !this.namespace.allTypes[typeDef.name.value]
          ) {
            return new MObject(
              this.getType.bind(this),
              typeDef,
              (t: MObject) => {
                this.namespace.types[t.name] = t;
                this.namespace.allTypes[t.name] = t;
              },
            );
          }
          break;
        }
        case Kind.EnumDefinition: {
          const enumDef = value as EnumDefinition;
          if (
            enumDef.name.value === name &&
            !this.namespace.allTypes[enumDef.name.value]
          ) {
            return new Enum(this.getType.bind(this), enumDef, (e: Enum) => {
              this.namespace.enums[e.name] = e;
              this.namespace.allTypes[e.name] = e;
            });
          }
          break;
        }
        case Kind.UnionDefinition: {
          const unionDef = value as UnionDefinition;
          if (
            unionDef.name.value === name &&
            !this.namespace.allTypes[unionDef.name.value]
          ) {
            return new Union(this.getType.bind(this), unionDef, (u: Union) => {
              this.namespace.unions[u.name] = u;
              this.namespace.allTypes[u.name] = u;
            });
          }
          break;
        }
        case Kind.InterfaceDefinition: {
          const ifaceDef = value as InterfaceDefinition;
          if (
            ifaceDef.name.value === name &&
            !this.namespace.interfaces[ifaceDef.name.value]
          ) {
            return new Interface(
              this.getType.bind(this),
              ifaceDef,
              (r: Interface) => {
                this.namespace.interfaces[r.name] = r;
              },
            );
          }
        }
      }
    }
  }
}

export interface Visitor {
  writeHead(context: Context): void;
  writeTail(context: Context): void;
  renderImports(context: Context): string;

  visitContextBefore(context: Context): void;
  visitContextAfter(context: Context): void;

  visitNamespaceBefore(context: Context): void;
  visitNamespace(context: Context): void;
  visitNamespaceAfter(context: Context): void;

  visitImportsBefore(context: Context): void;
  visitImport(context: Context): void;
  visitImportsAfter(context: Context): void;

  visitDirectivesBefore(context: Context): void;
  visitDirectiveBefore(context: Context): void;
  visitDirective(context: Context): void;
  visitDirectiveParametersBefore(context: Context): void;
  visitDirectiveParameter(context: Context): void;
  visitDirectiveParametersAfter(context: Context): void;
  visitDirectiveAfter(context: Context): void;
  visitDirectivesAfter(context: Context): void;

  visitAliasesBefore(context: Context): void;
  visitAliasBefore(context: Context): void;
  visitAlias(context: Context): void;
  visitAliasAfter(context: Context): void;
  visitAliasesAfter(context: Context): void;

  visitAllOperationsBefore(context: Context): void;
  visitFunctionsBefore(context: Context): void;
  visitFunctionBefore(context: Context): void;
  visitFunction(context: Context): void;
  visitFunctionAfter(context: Context): void;
  visitFunctionsAfter(context: Context): void;
  visitInterfacesBefore(context: Context): void;
  visitInterfaceBefore(context: Context): void;
  visitInterface(context: Context): void;
  visitOperationsBefore(context: Context): void;
  visitOperationBefore(context: Context): void;
  visitOperation(context: Context): void;
  visitParametersBefore(context: Context): void;
  visitParameter(context: Context): void;
  visitParametersAfter(context: Context): void;
  visitOperationAfter(context: Context): void;
  visitOperationsAfter(context: Context): void;
  visitInterfaceAfter(context: Context): void;
  visitInterfacesAfter(context: Context): void;
  visitAllOperationsAfter(context: Context): void;

  visitTypesBefore(context: Context): void;
  visitTypeBefore(context: Context): void;
  visitType(context: Context): void;
  visitTypeFieldsBefore(context: Context): void;
  visitTypeField(context: Context): void;
  visitTypeFieldsAfter(context: Context): void;
  visitTypeAfter(context: Context): void;
  visitTypesAfter(context: Context): void;

  visitEnumsBefore(context: Context): void;
  visitEnumBefore(context: Context): void;
  visitEnum(context: Context): void;
  visitEnumValuesBefore(context: Context): void;
  visitEnumValue(context: Context): void;
  visitEnumValuesAfter(context: Context): void;
  visitEnumAfter(context: Context): void;
  visitEnumsAfter(context: Context): void;

  visitUnionsBefore(context: Context): void;
  visitUnion(context: Context): void;
  visitUnionsAfter(context: Context): void;

  visitAnnotationsBefore(context: Context): void;
  visitAnnotationBefore(context: Context): void;
  visitAnnotation(context: Context): void;
  visitAnnotationArgumentsBefore(context: Context): void;
  visitAnnotationArgument(context: Context): void;
  visitAnnotationArgumentsAfter(context: Context): void;
  visitAnnotationAfter(context: Context): void;
  visitAnnotationsAfter(context: Context): void;
}

export type Callbacks = { [name: string]: { [name: string]: VisitorCallback } };
export type VisitorCallback = (_context: Context) => void;

export abstract class AbstractVisitor implements Visitor {
  callbacks: Callbacks = {};

  setCallback(phase: string, purpose: string, callback: VisitorCallback): void {
    let purposes = this.callbacks[phase];
    if (purposes == undefined) {
      purposes = {};
      this.callbacks[phase] = purposes;
    }
    purposes[purpose] = callback;
  }

  triggerCallbacks(context: Context, phase: string): void {
    const purposes = this.callbacks[phase];
    if (purposes == undefined) {
      return;
    }
    for (const name of Object.keys(purposes)) {
      const callback = purposes[name];
      callback(context);
    }
  }

  public writeHead(context: Context): void {
    this.triggerHead(context);
  }
  public triggerHead(context: Context): void {
    this.triggerCallbacks(context, "Head");
  }

  public writeTail(context: Context): void {
    this.triggerTail(context);
  }
  public triggerTail(context: Context): void {
    this.triggerCallbacks(context, "Tail");
  }
  public renderImports(_context: Context): string {
    return "";
  }

  public visitContextBefore(context: Context): void {
    this.triggerContextBefore(context);
  }
  public triggerContextBefore(context: Context): void {
    this.triggerCallbacks(context, "ContextBefore");
  }

  public visitContextAfter(context: Context): void {
    this.triggerContextAfter(context);
  }
  public triggerContextAfter(context: Context): void {
    this.triggerCallbacks(context, "ContextAfter");
  }

  public visitNamespaceBefore(context: Context): void {
    this.triggerNamespaceBefore(context);
  }
  public triggerNamespaceBefore(context: Context): void {
    this.triggerCallbacks(context, "NamespaceBefore");
  }
  public visitNamespace(context: Context): void {
    this.triggerNamespace(context);
  }
  public triggerNamespace(context: Context): void {
    this.triggerCallbacks(context, "Namespace");
  }
  public visitNamespaceAfter(context: Context): void {
    this.triggerNamespaceAfter(context);
  }
  public triggerNamespaceAfter(context: Context): void {
    this.triggerCallbacks(context, "NamespaceAfter");
  }
  public visitImportsBefore(context: Context): void {
    this.triggerImportsBefore(context);
  }
  public triggerImportsBefore(context: Context): void {
    this.triggerCallbacks(context, "ImportsBefore");
  }
  public visitImport(context: Context): void {
    this.triggerImport(context);
  }
  public triggerImport(context: Context): void {
    this.triggerCallbacks(context, "Import");
  }
  public visitImportsAfter(context: Context): void {
    this.triggerImportsAfter(context);
  }
  public triggerImportsAfter(context: Context): void {
    this.triggerCallbacks(context, "ImportsAfter");
  }

  public visitDirectivesBefore(context: Context): void {
    this.triggerDirectivesBefore(context);
  }
  public triggerDirectivesBefore(context: Context): void {
    this.triggerCallbacks(context, "DirectivesBefore");
  }
  public visitDirectiveBefore(context: Context): void {
    this.triggerDirectiveBefore(context);
  }
  public triggerDirectiveBefore(context: Context): void {
    this.triggerCallbacks(context, "DirectiveBefore");
  }
  public visitDirective(context: Context): void {
    this.triggerDirective(context);
  }
  public triggerDirective(context: Context): void {
    this.triggerCallbacks(context, "Directive");
  }

  public visitDirectiveParametersBefore(context: Context): void {
    this.triggerDirectiveParametersBefore(context);
  }
  public triggerDirectiveParametersBefore(context: Context): void {
    this.triggerCallbacks(context, "DirectiveParametersBefore");
  }
  public visitDirectiveParameter(context: Context): void {
    this.triggerDirectiveParameter(context);
  }
  public triggerDirectiveParameter(context: Context): void {
    this.triggerCallbacks(context, "DirectiveParameter");
  }
  public visitDirectiveParametersAfter(context: Context): void {
    this.triggerDirectiveParametersAfter(context);
  }
  public triggerDirectiveParametersAfter(context: Context): void {
    this.triggerCallbacks(context, "DirectiveParametersAfter");
  }

  public visitDirectiveAfter(context: Context): void {
    this.triggerDirectiveBefore(context);
  }
  public triggerDirectiveAfter(context: Context): void {
    this.triggerCallbacks(context, "DirectiveAfter");
  }
  public visitDirectivesAfter(context: Context): void {
    this.triggerDirectivesAfter(context);
  }
  public triggerDirectivesAfter(context: Context): void {
    this.triggerCallbacks(context, "DirectivesAfter");
  }

  public visitAliasesBefore(context: Context): void {
    this.triggerAliasesBefore(context);
  }
  public triggerAliasesBefore(context: Context): void {
    this.triggerCallbacks(context, "AliasesBefore");
  }
  public visitAliasBefore(context: Context): void {
    this.triggerAliasBefore(context);
  }
  public triggerAliasBefore(context: Context): void {
    this.triggerCallbacks(context, "AliasBefore");
  }
  public visitAlias(context: Context): void {
    this.triggerAlias(context);
  }
  public triggerAlias(context: Context): void {
    this.triggerCallbacks(context, "Alias");
  }
  public visitAliasAfter(context: Context): void {
    this.triggerAliasAfter(context);
  }
  public triggerAliasAfter(context: Context): void {
    this.triggerCallbacks(context, "AliasAfter");
  }
  public visitAliasesAfter(context: Context): void {
    this.triggerAliasesAfter(context);
  }
  public triggerAliasesAfter(context: Context): void {
    this.triggerCallbacks(context, "AliasesAfter");
  }

  public visitAllOperationsBefore(context: Context): void {
    this.triggerAllOperationsBefore(context);
  }
  public triggerAllOperationsBefore(context: Context): void {
    this.triggerCallbacks(context, "AllOperationsBefore");
  }
  public visitFunctionsBefore(context: Context): void {
    this.triggerFunctionsBefore(context);
  }
  public triggerFunctionsBefore(context: Context): void {
    this.triggerCallbacks(context, "FunctionsBefore");
  }
  public visitFunctionBefore(context: Context): void {
    this.triggerFunctionBefore(context);
  }
  public triggerFunctionBefore(context: Context): void {
    this.triggerCallbacks(context, "FunctionBefore");
  }
  public visitFunction(context: Context): void {
    this.triggerFunction(context);
  }
  public triggerFunction(context: Context): void {
    this.triggerCallbacks(context, "Function");
  }
  public visitFunctionAfter(context: Context): void {
    this.triggerFunctionAfter(context);
  }
  public triggerFunctionAfter(context: Context): void {
    this.triggerCallbacks(context, "FunctionAfter");
  }
  public visitFunctionsAfter(context: Context): void {
    this.triggerFunctionsAfter(context);
  }
  public triggerFunctionsAfter(context: Context): void {
    this.triggerCallbacks(context, "FunctionsAfter");
  }
  public visitInterfacesBefore(context: Context): void {
    this.triggerInterfacesBefore(context);
  }
  public triggerInterfacesBefore(context: Context): void {
    this.triggerCallbacks(context, "InterfacesBefore");
  }
  public visitInterfaceBefore(context: Context): void {
    this.triggerInterfaceBefore(context);
  }
  public triggerInterfaceBefore(context: Context): void {
    this.triggerCallbacks(context, "InterfaceBefore");
  }
  public visitInterface(context: Context): void {
    this.triggerInterface(context);
  }
  public triggerInterface(context: Context): void {
    this.triggerCallbacks(context, "Interface");
  }
  public visitOperationsBefore(context: Context): void {
    this.triggerOperationsBefore(context);
  }
  public triggerOperationsBefore(context: Context): void {
    this.triggerCallbacks(context, "OperationsBefore");
  }
  public visitOperationBefore(context: Context): void {
    this.triggerOperationBefore(context);
  }
  public triggerOperationBefore(context: Context): void {
    this.triggerCallbacks(context, "OperationBefore");
  }
  public visitOperation(context: Context): void {
    this.triggerOperation(context);
  }
  public triggerOperation(context: Context): void {
    this.triggerCallbacks(context, "Operation");
  }
  public visitParametersBefore(context: Context): void {
    this.triggerParametersBefore(context);
  }
  public triggerParametersBefore(context: Context): void {
    this.triggerCallbacks(context, "ParametersBefore");
  }
  public visitParameter(context: Context): void {
    this.triggerParameter(context);
  }
  public triggerParameter(context: Context): void {
    this.triggerCallbacks(context, "Parameter");
  }
  public visitParametersAfter(context: Context): void {
    this.triggerParametersAfter(context);
  }
  public triggerParametersAfter(context: Context): void {
    this.triggerCallbacks(context, "ParametersAfter");
  }
  public visitOperationAfter(context: Context): void {
    this.triggerOperationAfter(context);
  }
  public triggerOperationAfter(context: Context): void {
    this.triggerCallbacks(context, "OperationAfter");
  }
  public visitOperationsAfter(context: Context): void {
    this.triggerOperationsAfter(context);
  }
  public triggerOperationsAfter(context: Context): void {
    this.triggerCallbacks(context, "OperationsAfter");
  }
  public visitInterfaceAfter(context: Context): void {
    this.triggerInterfaceAfter(context);
  }
  public triggerInterfaceAfter(context: Context): void {
    this.triggerCallbacks(context, "InterfaceAfter");
  }
  public visitInterfacesAfter(context: Context): void {
    this.triggerInterfacesAfter(context);
  }
  public triggerInterfacesAfter(context: Context): void {
    this.triggerCallbacks(context, "InterfacesAfter");
  }
  public visitAllOperationsAfter(context: Context): void {
    this.triggerAllOperationsAfter(context);
  }
  public triggerAllOperationsAfter(context: Context): void {
    this.triggerCallbacks(context, "AllOperationsAfter");
  }

  public visitTypesBefore(context: Context): void {
    this.triggerTypesBefore(context);
  }
  public triggerTypesBefore(context: Context): void {
    this.triggerCallbacks(context, "TypesBefore");
  }
  public visitTypeBefore(context: Context): void {
    this.triggerTypeBefore(context);
  }
  public triggerTypeBefore(context: Context): void {
    this.triggerCallbacks(context, "TypeBefore");
  }
  public visitType(context: Context): void {
    this.triggerType(context);
  }
  public triggerType(context: Context): void {
    this.triggerCallbacks(context, "Type");
  }
  public visitTypeFieldsBefore(context: Context): void {
    this.triggerTypeFieldsBefore(context);
  }
  public triggerTypeFieldsBefore(context: Context): void {
    this.triggerCallbacks(context, "TypeFieldsBefore");
  }
  public visitTypeField(context: Context): void {
    this.triggerTypeField(context);
  }
  public triggerTypeField(context: Context): void {
    this.triggerCallbacks(context, "TypeField");
  }
  public visitTypeFieldsAfter(context: Context): void {
    this.triggerTypeFieldsAfter(context);
  }
  public triggerTypeFieldsAfter(context: Context): void {
    this.triggerCallbacks(context, "TypeFieldsAfter");
  }
  public visitTypeAfter(context: Context): void {
    this.triggerTypeAfter(context);
  }
  public triggerTypeAfter(context: Context): void {
    this.triggerCallbacks(context, "TypeAfter");
  }
  public visitTypesAfter(context: Context): void {
    this.triggerTypesAfter(context);
  }
  public triggerTypesAfter(context: Context): void {
    this.triggerCallbacks(context, "TypesAfter");
  }

  public visitEnumsBefore(context: Context): void {
    this.triggerEnumsBefore(context);
  }
  public triggerEnumsBefore(context: Context): void {
    this.triggerCallbacks(context, "EnumsBefore");
  }
  public visitEnumBefore(context: Context): void {
    this.triggerEnumsBefore(context);
  }
  public triggerEnumBefore(context: Context): void {
    this.triggerCallbacks(context, "EnumBefore");
  }
  public visitEnum(context: Context): void {
    this.triggerEnum(context);
  }
  public triggerEnum(context: Context): void {
    this.triggerCallbacks(context, "Enum");
  }
  public visitEnumValuesBefore(context: Context): void {
    this.triggerEnumValuesBefore(context);
  }
  public triggerEnumValuesBefore(context: Context): void {
    this.triggerCallbacks(context, "EnumValuesBefore");
  }
  public visitEnumValue(context: Context): void {
    this.triggerEnumValue(context);
  }
  public triggerEnumValue(context: Context): void {
    this.triggerCallbacks(context, "EnumValue");
  }
  public visitEnumValuesAfter(context: Context): void {
    this.triggerEnumValuesAfter(context);
  }
  public triggerEnumValuesAfter(context: Context): void {
    this.triggerCallbacks(context, "EnumValuesAfter");
  }
  public visitEnumAfter(context: Context): void {
    this.triggerEnumsAfter(context);
  }
  public triggerEnumAfter(context: Context): void {
    this.triggerCallbacks(context, "EnumAfter");
  }
  public visitEnumsAfter(context: Context): void {
    this.triggerEnumsAfter(context);
  }
  public triggerEnumsAfter(context: Context): void {
    this.triggerCallbacks(context, "EnumsAfter");
  }

  public visitUnionsBefore(context: Context): void {
    this.triggerUnionsBefore(context);
  }
  public triggerUnionsBefore(context: Context): void {
    this.triggerCallbacks(context, "UnionsBefore");
  }
  public visitUnion(context: Context): void {
    this.triggerCallbacks(context, "Union");
  }
  public triggerUnion(context: Context): void {
    this.triggerCallbacks(context, "Union");
  }
  public visitUnionsAfter(context: Context): void {
    this.triggerUnionsAfter(context);
  }
  public triggerUnionsAfter(context: Context): void {
    this.triggerCallbacks(context, "UnionsAfter");
  }

  public visitAnnotationsBefore(context: Context): void {
    this.triggerAnnotationsBefore(context);
  }
  public triggerAnnotationsBefore(context: Context): void {
    this.triggerCallbacks(context, "AnnotationsBefore");
  }
  public visitAnnotationBefore(context: Context): void {
    this.triggerAnnotationBefore(context);
  }
  public triggerAnnotationBefore(context: Context): void {
    this.triggerCallbacks(context, "AnnotationBefore");
  }
  public visitAnnotation(context: Context): void {
    this.triggerAnnotation(context);
  }
  public triggerAnnotation(context: Context): void {
    this.triggerCallbacks(context, "Annotation");
  }

  public visitAnnotationArgumentsBefore(context: Context): void {
    this.triggerAnnotationArgumentsBefore(context);
  }
  public triggerAnnotationArgumentsBefore(context: Context): void {
    this.triggerCallbacks(context, "AnnotationArgumentsBefore");
  }
  public visitAnnotationArgument(context: Context): void {
    this.triggerAnnotationArgument(context);
  }
  public triggerAnnotationArgument(context: Context): void {
    this.triggerCallbacks(context, "AnnotationArgument");
  }
  public visitAnnotationArgumentsAfter(context: Context): void {
    this.triggerAnnotationArgumentsAfter(context);
  }
  public triggerAnnotationArgumentsAfter(context: Context): void {
    this.triggerCallbacks(context, "AnnotationArgumentsAfter");
  }
  public visitAnnotationAfter(context: Context): void {
    this.triggerAnnotationAfter(context);
  }
  public triggerAnnotationAfter(context: Context): void {
    this.triggerCallbacks(context, "AnnotationAfter");
  }
  public visitAnnotationsAfter(context: Context): void {
    this.triggerAnnotationsAfter(context);
  }
  public triggerAnnotationsAfter(context: Context): void {
    this.triggerCallbacks(context, "AnnotationsAfter");
  }
}

export class BaseVisitor extends AbstractVisitor {
  writer: Writer;

  constructor(writer: Writer) {
    super();
    this.writer = writer;
  }

  protected write(code: string): void {
    this.writer.write(code);
  }
}

export class MultiVisitor extends AbstractVisitor {
  private visitors: Visitor[];

  constructor(...visitors: Visitor[]) {
    super();
    this.visitors = new Array<Visitor>();
    this.visitors.push(...visitors);
  }

  addVisitors(...visitors: Visitor[]): void {
    this.visitors.push(...visitors);
  }

  public visitNamespaceBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitNamespaceBefore(context);
    });
  }
  public visitNamespace(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitNamespace(context);
    });
  }
  public visitNamespaceAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitNamespaceAfter(context);
    });
  }
  public visitImportsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitImportsBefore(context);
    });
  }
  public visitImport(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitImport(context);
    });
  }
  public visitImportsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitImportsAfter(context);
    });
  }

  public visitDirectivesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectivesBefore(context);
    });
  }
  public visitDirectiveBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveBefore(context);
    });
  }
  public visitDirective(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirective(context);
    });
  }
  public visitDirectiveParametersBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveParametersBefore(context);
    });
  }
  public visitDirectiveParameter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveParameter(context);
    });
  }
  public visitDirectiveParametersAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveParametersAfter(context);
    });
  }
  public visitDirectiveAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveAfter(context);
    });
  }
  public visitDirectivesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectivesAfter(context);
    });
  }

  public visitAliasesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasesBefore(context);
    });
  }
  public visitAliasBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasBefore(context);
    });
  }
  public visitAlias(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAlias(context);
    });
  }
  public visitAliasAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasAfter(context);
    });
  }
  public visitAliasesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasesAfter(context);
    });
  }

  public visitAllOperationsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAllOperationsBefore(context);
    });
  }
  public visitInterfacesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfacesBefore(context);
    });
  }
  public visitInterfaceBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfaceBefore(context);
    });
  }
  public visitInterface(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterface(context);
    });
  }
  public visitOperationsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationsBefore(context);
    });
  }
  public visitOperationBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationBefore(context);
    });
  }
  public visitOperation(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperation(context);
    });
  }
  public visitParametersBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitParametersBefore(context);
    });
  }
  public visitParameter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitParameter(context);
    });
  }
  public visitParametersAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitParametersAfter(context);
    });
  }
  public visitOperationAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationAfter(context);
    });
  }
  public visitOperationsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationsAfter(context);
    });
  }
  public visitInterfaceAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfaceAfter(context);
    });
  }
  public visitInterfacesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfacesAfter(context);
    });
  }
  public visitAllOperationsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAllOperationsAfter(context);
    });
  }

  public visitTypesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypesBefore(context);
    });
  }
  public visitTypeBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeBefore(context);
    });
  }
  public visitType(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitType(context);
    });
  }
  public visitTypeFieldsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeFieldsBefore(context);
    });
  }
  public visitTypeField(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeField(context);
    });
  }
  public visitTypeFieldsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeFieldsAfter(context);
    });
  }
  public visitTypeAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeAfter(context);
    });
  }
  public visitTypesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypesAfter(context);
    });
  }

  public visitEnumsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumsAfter(context);
    });
  }
  public visitEnum(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnum(context);
    });
  }
  public visitEnumValuesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumValuesBefore(context);
    });
  }
  public visitEnumValue(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumValue(context);
    });
  }
  public visitEnumValuesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumValuesAfter(context);
    });
  }
  public visitEnumsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumsAfter(context);
    });
  }

  public visitUnionsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitUnionsBefore(context);
    });
  }
  public visitUnion(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitUnion(context);
    });
  }

  public visitUnionsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitUnionsAfter(context);
    });
  }

  public visitAnnotationsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationsBefore(context);
    });
  }
  public visitAnnotation(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotation(context);
    });
  }
  public visitAnnotationArgumentsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationArgumentsBefore(context);
    });
  }
  public visitAnnotationArgument(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationArgument(context);
    });
  }
  public visitAnnotationArgumentsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationArgumentsAfter(context);
    });
  }
  public visitAnnotationsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationsAfter(context);
    });
  }
}
