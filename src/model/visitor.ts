import {
  Namespace,
  AnyType,
  Interface,
  Role,
  Enum,
  Union,
  Parameter,
  Field,
  Operation,
  EnumValue,
  Directive,
  Alias,
  Type as MObject,
  Optional,
  List,
  Map,
  Stream,
  primitives,
  VoidValue,
} from "./model.js";
import {
  Document,
  Annotation,
  NamespaceDefinition,
  DirectiveDefinition,
  AliasDefinition,
  InterfaceDefinition,
  RoleDefinition,
  TypeDefinition,
  EnumDefinition,
  UnionDefinition,
  Named,
  Name,
} from "../ast/index.js";
import autoBind from "../auto-bind.js";
import { ApexError } from "../error/index.js";
import { Kind } from "../ast/index.js";
import {
  Type as ASTType,
  Kind as ASTKind,
  ListType as ASTListType,
  MapType as ASTMapType,
  Optional as ASTOptional,
  Stream as ASTStream,
} from "../ast/index.js";

export class Writer {
  private code: string = "";

  write(source: string) {
    this.code += source;
  }

  string(): string {
    return this.code;
  }
}

export type ObjectMap<T = any> = { [key: string]: T };

interface NamedParameters {
  namespace?: Namespace;
  directive?: Directive;
  alias?: Alias;
  interfaceDef?: Interface;
  role?: Role;
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

export class Context {
  config: ObjectMap;
  document?: Document;

  // Top-level definitions
  namespaces: Namespace[];

  // Drill-down definitions
  namespace: Namespace;
  namespacePos: number = 9999;
  directive?: Directive;
  alias?: Alias;
  interface?: Interface;
  role?: Role;
  type?: MObject;
  operations?: Operation[];
  operation?: Operation;
  parameters?: Parameter[];
  parameter?: Parameter;
  parameterIndex?: number;
  fields?: Field[];
  field?: Field;
  fieldIndex?: number;
  enum?: Enum;
  enumValues?: EnumValue[];
  enumValue?: EnumValue;
  union?: Union;

  annotations?: Annotation[];
  annotation?: Annotation;

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
        undefined
      )
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
    interfaceDef,
    role,
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
    var context = new Context(this.config, undefined, this);

    context.namespace = namespace || this.namespace;
    context.namespacePos = this.namespacePos;
    context.directive = directive || this.directive;
    context.alias = alias || this.alias;
    context.interface = interfaceDef || this.interface;
    context.role = role || this.role;
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
        case Kind.NamespaceDefinition:
          const namespace = new Namespace(
            this.getType.bind(this),
            value as NamespaceDefinition
          );
          this.namespaces.push(namespace);
          this.namespace = namespace;
          this.namespacePos = index;
          break;
        case Kind.AliasDefinition:
          const aliasDef = value as AliasDefinition;
          this.typeMap[aliasDef.name.value] = aliasDef;
          break;
        case Kind.TypeDefinition:
          const typeDef = value as TypeDefinition;
          this.typeMap[typeDef.name.value] = typeDef;
          break;
        case Kind.EnumDefinition:
          const enumDef = value as EnumDefinition;
          this.typeMap[enumDef.name.value] = enumDef;
          break;
        case Kind.UnionDefinition:
          const unionDef = value as UnionDefinition;
          this.typeMap[unionDef.name.value] = unionDef;
          break;
      }
    });

    if (!this.namespace || this.namespace.name == "undefined") {
      throw new Error("namespace not found");
    }

    this.document!.definitions.forEach((value, index) => {
      switch (value.getKind()) {
        case Kind.DirectiveDefinition:
          const directiveDef = value as DirectiveDefinition;
          const directive = new Directive(
            this.getType.bind(this),
            directiveDef
          );
          this.namespace.directives[directive.name] = directive;
          break;
        case Kind.AliasDefinition:
          const aliasDef = value as AliasDefinition;
          if (!this.namespace.allTypes[aliasDef.name.value]) {
            const alias = new Alias(this.getType.bind(this), aliasDef);
            this.namespace.aliases[alias.name] = alias;
            this.namespace.allTypes[alias.name] = alias;
          }
          break;
        case Kind.InterfaceDefinition:
          const iface = new Interface(
            this.getType.bind(this),
            value as InterfaceDefinition
          );
          this.namespace.interfaces.push(iface);
          break;
        case Kind.RoleDefinition:
          const role = new Role(
            this.getType.bind(this),
            value as RoleDefinition
          );
          this.namespace.roles[role.name] = role;
          break;
        case Kind.TypeDefinition:
          const typeDef = value as TypeDefinition;
          if (!this.namespace.allTypes[typeDef.name.value]) {
            const type = new MObject(this.getType.bind(this), typeDef);
            this.namespace.types[type.name] = type;
            this.namespace.allTypes[type.name] = type;
          }
          break;
        case Kind.EnumDefinition:
          const enumDef = value as EnumDefinition;
          if (!this.namespace.allTypes[enumDef.name.value]) {
            const enumInst = new Enum(this.getType.bind(this), enumDef);
            this.namespace.enums[enumInst.name] = enumInst;
            this.namespace.allTypes[enumInst.name] = enumInst;
          }
          break;
        case Kind.UnionDefinition:
          const unionDef = value as UnionDefinition;
          if (!this.namespace.allTypes[unionDef.name.value]) {
            const union = new Union(this.getType.bind(this), unionDef);
            this.namespace.unions[union.name] = union;
            this.namespace.allTypes[union.name] = union;
          }
          break;
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
      case ASTKind.Named:
        const name = (t as Named).name.value;
        if (name === "void") {
          return VoidValue;
        }

        let namedType = this.namespace!.allTypes[name];
        if (namedType != undefined) {
          return namedType;
        }

        namedType = primitives[name];
        if (namedType != undefined) {
          return namedType;
        }

        const anyTypeDef = this.typeMap[name];
        switch (anyTypeDef.getKind()) {
          case ASTKind.AliasDefinition:
            const alias = new Alias(
              this.getType.bind(this),
              anyTypeDef as AliasDefinition
            );
            this.namespace!.aliases[name] = alias;
            this.namespace!.allTypes[name] = alias;
            return alias;
          case ASTKind.TypeDefinition:
            const type = new MObject(
              this.getType.bind(this),
              anyTypeDef as TypeDefinition
            );
            this.namespace!.types[name] = type;
            this.namespace!.allTypes[name] = type;
            return type;
          case ASTKind.UnionDefinition:
            const union = new Union(
              this.getType.bind(this),
              anyTypeDef as UnionDefinition
            );
            this.namespace!.unions[name] = union;
            this.namespace!.allTypes[name] = union;
            return union;
          case ASTKind.EnumDefinition:
            const enumDef = (namedType = new Enum(
              this.getType.bind(this),
              anyTypeDef as EnumDefinition
            ));
            this.namespace!.enums[name] = enumDef;
            this.namespace!.allTypes[name] = enumDef;
            return enumDef;
        }

        if (namedType != undefined) {
          this.namespace!.allTypes[name] = namedType;
          return namedType;
        }

        break;
      case ASTKind.Optional:
        const optional = t as ASTOptional;
        return new Optional(this.getType.bind(this), optional);
      case ASTKind.ListType:
        const list = t as ASTListType;
        return new List(this.getType.bind(this), list);
      case ASTKind.MapType:
        const map = t as ASTMapType;
        return new Map(this.getType.bind(this), map);
      case ASTKind.Stream:
        const stream = t as ASTStream;
        return new Stream(this.getType.bind(this), stream);
    }

    throw new Error("could not resolve type: " + t);
  }

  accept(context: Context, visitor: Visitor): void {
    context.namespaces.map((namespace) => {
      namespace.accept(context.clone({ namespace: namespace }), visitor);
    });
  }
}

export interface Visitor {
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
  visitInterfaceBefore(context: Context): void;
  visitInterface(context: Context): void;
  visitRolesBefore(context: Context): void;
  visitRoleBefore(context: Context): void;
  visitRole(context: Context): void;
  visitOperationsBefore(context: Context): void;
  visitOperationBefore(context: Context): void;
  visitOperation(context: Context): void;
  visitParametersBefore(context: Context): void;
  visitParameter(context: Context): void;
  visitParametersAfter(context: Context): void;
  visitOperationAfter(context: Context): void;
  visitOperationsAfter(context: Context): void;
  visitInterfaceAfter(context: Context): void;
  visitRoleAfter(context: Context): void;
  visitRolesAfter(context: Context): void;
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
    var purposes = this.callbacks[phase];
    if (purposes == undefined) {
      purposes = {};
      this.callbacks[phase] = purposes;
    }
    purposes[purpose] = callback;
  }

  triggerCallbacks(context: Context, phase: string): void {
    var purposes = this.callbacks[phase];
    if (purposes == undefined) {
      return;
    }
    for (let name of Object.keys(purposes)) {
      const callback = purposes[name];
      callback(context);
    }
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
  public visitRolesBefore(context: Context): void {
    this.triggerRolesBefore(context);
  }
  public triggerRolesBefore(context: Context): void {
    this.triggerCallbacks(context, "RolesBefore");
  }
  public visitRoleBefore(context: Context): void {
    this.triggerRoleBefore(context);
  }
  public triggerRoleBefore(context: Context): void {
    this.triggerCallbacks(context, "RoleBefore");
  }
  public visitRole(context: Context): void {
    this.triggerRole(context);
  }
  public triggerRole(context: Context): void {
    this.triggerCallbacks(context, "Role");
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
  public visitRoleAfter(context: Context): void {
    this.triggerRoleAfter(context);
  }
  public triggerRoleAfter(context: Context): void {
    this.triggerCallbacks(context, "RoleAfter");
  }
  public visitRolesAfter(context: Context): void {
    this.triggerRolesAfter(context);
  }
  public triggerRolesAfter(context: Context): void {
    this.triggerCallbacks(context, "RolesAfter");
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
  public visitRolesBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitRolesBefore(context);
    });
  }
  public visitRoleBefore(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitRoleBefore(context);
    });
  }
  public visitRole(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitRole(context);
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
  public visitRoleAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitRoleAfter(context);
    });
  }
  public visitRolesAfter(context: Context): void {
    this.visitors.map((visitor) => {
      visitor.visitRolesAfter(context);
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
