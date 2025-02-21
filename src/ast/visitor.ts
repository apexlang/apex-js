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
  DirectiveDefinition,
  EnumDefinition,
  EnumValueDefinition,
  FieldDefinition,
  ImportDefinition,
  InterfaceDefinition,
  NamespaceDefinition,
  OperationDefinition,
  ParameterDefinition,
  TypeDefinition,
  UnionDefinition,
} from "./definitions.ts";
import { Document } from "./document.ts";
import { Annotation, Name } from "./nodes.ts";
import autoBind from "../auto-bind.ts";
import { ApexError } from "../error/mod.ts";
import { Kind } from "./kinds.ts";

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
  namespace?: NamespaceDefinition;
  importDef?: ImportDefinition;
  directive?: DirectiveDefinition;
  alias?: AliasDefinition;
  interface?: InterfaceDefinition;
  type?: TypeDefinition;
  operations?: OperationDefinition[];
  operation?: OperationDefinition;
  parameters?: ParameterDefinition[];
  parameter?: ParameterDefinition;
  parameterIndex?: number;
  fields?: FieldDefinition[];
  field?: FieldDefinition;
  fieldIndex?: number;
  enumDef?: EnumDefinition;
  enumValues?: EnumValueDefinition[];
  enumValue?: EnumValueDefinition;
  union?: UnionDefinition;
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

export class Context {
  config: ObjectMap;
  document?: Document;

  // Top-level definitions
  namespaces: NamespaceDefinition[];
  imports: ImportDefinition[];
  directives: DirectiveDefinition[];
  directiveMap: Map<string, DirectiveDefinition>;
  aliases: AliasDefinition[];
  functions: OperationDefinition[];
  interfaces: InterfaceDefinition[];
  types: TypeDefinition[];
  enums: EnumDefinition[];
  unions: UnionDefinition[];
  allTypes: Map<
    string,
    | TypeDefinition
    | EnumDefinition
    | UnionDefinition
    | AliasDefinition
    | InterfaceDefinition
  >;

  // Drill-down definitions
  namespace: NamespaceDefinition;
  namespacePos = 9999;
  import?: ImportDefinition;
  directive?: DirectiveDefinition;
  alias?: AliasDefinition;
  interface?: InterfaceDefinition;
  type?: TypeDefinition;
  operations?: OperationDefinition[];
  operation?: OperationDefinition;
  parameters?: ParameterDefinition[];
  parameter?: ParameterDefinition;
  parameterIndex?: number;
  fields?: FieldDefinition[];
  field?: FieldDefinition;
  fieldIndex?: number;
  enum?: EnumDefinition;
  enumValues?: EnumValueDefinition[];
  enumValue?: EnumValueDefinition;
  union?: UnionDefinition;

  annotations?: Annotation[];
  annotation?: Annotation;

  private errors: ErrorHolder;

  constructor(config: ObjectMap, document?: Document, other?: Context) {
    this.config = config || {};

    if (other != undefined) {
      this.document = other.document;
      this.namespace = other.namespace;
      this.namespaces = other.namespaces;
      this.imports = other.imports;
      this.directives = other.directives;
      this.directiveMap = other.directiveMap;
      this.aliases = other.aliases;
      this.functions = other.functions;
      this.interfaces = other.interfaces;
      this.enums = other.enums;
      this.types = other.types;
      this.unions = other.unions;
      this.annotations = other.annotations;
      this.annotation = other.annotation;
      this.allTypes = other.allTypes;

      this.errors = other.errors;
    } else {
      this.namespace = new NamespaceDefinition(
        undefined,
        new Name(undefined, ""),
        undefined,
      );
      this.namespaces = new Array<NamespaceDefinition>();
      this.directives = new Array<DirectiveDefinition>();
      this.directiveMap = new Map<string, DirectiveDefinition>();
      this.imports = new Array<ImportDefinition>();
      this.aliases = new Array<AliasDefinition>();
      this.functions = new Array<OperationDefinition>();
      this.interfaces = new Array<InterfaceDefinition>();
      this.enums = new Array<EnumDefinition>();
      this.types = new Array<TypeDefinition>();
      this.unions = new Array<UnionDefinition>();
      this.annotations = new Array<Annotation>();
      this.allTypes = new Map<
        string,
        TypeDefinition | EnumDefinition | UnionDefinition | AliasDefinition
      >();

      this.errors = new ErrorHolder();
    }

    if (this.document == undefined && document != undefined) {
      this.document = document!;
      this.parseDocument();
    }

    autoBind(this);
  }

  clone({
    namespace,
    importDef,
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
    context.import = importDef || this.import;
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

  private parseDocument(): void {
    this.document!.definitions.forEach((value, index) => {
      switch (value.getKind()) {
        case Kind.NamespaceDefinition: {
          const namespace = value as NamespaceDefinition;
          this.namespaces.push(namespace);
          this.namespace = namespace;
          this.namespacePos = index;
          break;
        }
        case Kind.DirectiveDefinition: {
          const directive = value as DirectiveDefinition;
          this.directives.push(directive);
          this.directiveMap.set(directive.name.value, directive);
          break;
        }
        case Kind.ImportDefinition: {
          this.imports.push(value as ImportDefinition);
          break;
        }
        case Kind.AliasDefinition: {
          const alias = value as AliasDefinition;
          this.aliases.push(alias);
          this.allTypes.set(alias.name.value, alias);
          break;
        }
        case Kind.OperationDefinition: {
          const oper = value as OperationDefinition;
          this.functions.push(oper);
          break;
        }
        case Kind.InterfaceDefinition: {
          const iface = value as InterfaceDefinition;
          this.interfaces.push(iface);
          this.allTypes.set(iface.name.value, iface);
          break;
        }
        case Kind.TypeDefinition: {
          const type = value as TypeDefinition;
          this.types.push(type);
          this.allTypes.set(type.name.value, type);
          break;
        }
        case Kind.EnumDefinition: {
          const enumDef = value as EnumDefinition;
          this.enums.push(enumDef);
          this.allTypes.set(enumDef.name.value, enumDef);
          break;
        }
        case Kind.UnionDefinition: {
          const union = value as UnionDefinition;
          this.unions.push(union);
          this.allTypes.set(union.name.value, union);
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
}

export interface Visitor {
  writeHead(context: Context): void;
  writeTail(context: Context): void;
  renderImports(context: Context): string;

  visitDocumentBefore(context: Context): void;
  visitNamespace(context: Context): void;

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
  visitUnionMembersBefore(context: Context): void;
  visitUnionMember(context: Context): void;
  visitUnionMembersAfter(context: Context): void;
  visitUnionsAfter(context: Context): void;

  visitAnnotationsBefore(context: Context): void;
  visitAnnotationBefore(context: Context): void;
  visitAnnotation(context: Context): void;
  visitAnnotationArgumentsBefore(context: Context): void;
  visitAnnotationArgument(context: Context): void;
  visitAnnotationArgumentsAfter(context: Context): void;
  visitAnnotationAfter(context: Context): void;
  visitAnnotationsAfter(context: Context): void;

  visitDocumentAfter(_context: Context): void;
}

export type Callbacks = Map<string, Map<string, VisitorCallback>>;
export type VisitorCallback = (_context: Context) => void;

export abstract class AbstractVisitor implements Visitor {
  callbacks: Callbacks = new Map<string, Map<string, VisitorCallback>>();

  setCallback(phase: string, purpose: string, callback: VisitorCallback): void {
    let purposes = this.callbacks.get(phase);
    if (purposes == undefined) {
      purposes = new Map<string, VisitorCallback>();
      this.callbacks.set(phase, purposes);
    }
    purposes.set(purpose, callback);
  }

  triggerCallbacks(context: Context, phase: string): void {
    const purposes = this.callbacks.get(phase);
    if (purposes == undefined) {
      return;
    }
    purposes.forEach((callback) => {
      callback(context);
    });
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

  public visitDocumentBefore(context: Context): void {
    this.triggerDocumentBefore(context);
  }
  public triggerDocumentBefore(context: Context): void {
    this.triggerCallbacks(context, "DocumentBefore");
  }
  public visitNamespace(context: Context): void {
    this.triggerNamespace(context);
  }
  public triggerNamespace(context: Context): void {
    this.triggerCallbacks(context, "Namespace");
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
    this.triggerAliasBefore(context);
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
  public visitUnionMembersBefore(context: Context): void {
    this.triggerUnionValuesBefore(context);
  }
  public triggerUnionValuesBefore(context: Context): void {
    this.triggerCallbacks(context, "UnionMembersBefore");
  }
  public visitUnionMember(context: Context): void {
    this.triggerEnumValue(context);
  }
  public triggerUnionValue(context: Context): void {
    this.triggerCallbacks(context, "UnionValue");
  }
  public visitUnionMembersAfter(context: Context): void {
    this.triggerEnumValuesAfter(context);
  }
  public triggerUnionValuesAfter(context: Context): void {
    this.triggerCallbacks(context, "UnionMembersAfter");
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

  public visitDocumentAfter(context: Context): void {
    this.triggerDocumentAfter(context);
  }
  public triggerDocumentAfter(context: Context): void {
    this.triggerCallbacks(context, "DocumentAfter");
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

  public override visitDocumentBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDocumentBefore(context);
    });
  }
  public override visitNamespace(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitNamespace(context);
    });
  }
  public override visitImportsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitImportsBefore(context);
    });
  }
  public override visitImport(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitImport(context);
    });
  }
  public override visitImportsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitImportsAfter(context);
    });
  }

  public override visitDirectivesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectivesBefore(context);
    });
  }
  public override visitDirectiveBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveBefore(context);
    });
  }
  public override visitDirective(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirective(context);
    });
  }
  public override visitDirectiveParametersBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveParametersBefore(context);
    });
  }
  public override visitDirectiveParameter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveParameter(context);
    });
  }
  public override visitDirectiveParametersAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveParametersAfter(context);
    });
  }
  public override visitDirectiveAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectiveAfter(context);
    });
  }
  public override visitDirectivesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDirectivesAfter(context);
    });
  }

  public override visitAliasesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasesBefore(context);
    });
  }
  public override visitAliasBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasBefore(context);
    });
  }
  public override visitAlias(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAlias(context);
    });
  }
  public override visitAliasAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasAfter(context);
    });
  }
  public override visitAliasesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAliasesAfter(context);
    });
  }

  public override visitAllOperationsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAllOperationsBefore(context);
    });
  }
  public override visitInterfacesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfacesBefore(context);
    });
  }
  public override visitInterfaceBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfaceBefore(context);
    });
  }
  public override visitInterface(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterface(context);
    });
  }
  public override visitFunctionsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitFunctionsBefore(context);
    });
  }
  public override visitFunctionBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitFunctionBefore(context);
    });
  }
  public override visitFunction(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitFunction(context);
    });
  }
  public override visitFunctionAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitFunctionAfter(context);
    });
  }
  public override visitFunctionsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitFunctionsAfter(context);
    });
  }
  public override visitOperationsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationsBefore(context);
    });
  }
  public override visitOperationBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationBefore(context);
    });
  }
  public override visitOperation(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperation(context);
    });
  }
  public override visitParametersBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitParametersBefore(context);
    });
  }
  public override visitParameter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitParameter(context);
    });
  }
  public override visitParametersAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitParametersAfter(context);
    });
  }
  public override visitOperationAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationAfter(context);
    });
  }
  public override visitOperationsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitOperationsAfter(context);
    });
  }
  public override visitInterfaceAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfaceAfter(context);
    });
  }
  public override visitInterfacesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitInterfacesAfter(context);
    });
  }
  public override visitAllOperationsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAllOperationsAfter(context);
    });
  }

  public override visitTypesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypesBefore(context);
    });
  }
  public override visitTypeBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeBefore(context);
    });
  }
  public override visitType(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitType(context);
    });
  }
  public override visitTypeFieldsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeFieldsBefore(context);
    });
  }
  public override visitTypeField(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeField(context);
    });
  }
  public override visitTypeFieldsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeFieldsAfter(context);
    });
  }
  public override visitTypeAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypeAfter(context);
    });
  }
  public override visitTypesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitTypesAfter(context);
    });
  }

  public override visitEnumsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumsAfter(context);
    });
  }
  public override visitEnum(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnum(context);
    });
  }
  public override visitEnumValuesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumValuesBefore(context);
    });
  }
  public override visitEnumValue(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumValue(context);
    });
  }
  public override visitEnumValuesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumValuesAfter(context);
    });
  }
  public override visitEnumsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitEnumsAfter(context);
    });
  }

  public override visitUnionsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitUnionsBefore(context);
    });
  }
  public override visitUnion(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitUnion(context);
    });
  }

  public override visitUnionsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitUnionsAfter(context);
    });
  }

  public override visitAnnotationsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationsBefore(context);
    });
  }
  public override visitAnnotation(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotation(context);
    });
  }
  public override visitAnnotationArgumentsBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationArgumentsBefore(context);
    });
  }
  public override visitAnnotationArgument(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationArgument(context);
    });
  }
  public override visitAnnotationArgumentsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationArgumentsAfter(context);
    });
  }
  public override visitAnnotationsAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitAnnotationsAfter(context);
    });
  }

  public override visitDocumentAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitDocumentAfter(context);
    });
  }
}
