import {
  NamespaceDefinition,
  ObjectDefinition,
  InterfaceDefinition,
  RoleDefinition,
  EnumDefinition,
  UnionDefinition,
  InputValueDefinition,
  FieldDefinition,
  OperationDefinition,
  EnumValueDefinition,
} from "./type_definitions";
import { Document } from "./document";
import { Name } from "./name";
import { AnnotationDefinition } from "./definitions";
import autoBind from "../auto-bind";

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
  role?: RoleDefinition;
  object?: ObjectDefinition;
  operations?: OperationDefinition[];
  operation?: OperationDefinition;
  argumentsDef?: InputValueDefinition[];
  argument?: InputValueDefinition;
  argumentIndex?: number;
  fields?: FieldDefinition[];
  field?: FieldDefinition;
  fieldIndex?: number;
  enumDef?: EnumDefinition;
  enumValues?: EnumValueDefinition[];
  enumValue?: EnumValueDefinition;
  union?: UnionDefinition;
  input?: InputValueDefinition;
  annotations?: AnnotationDefinition[];
  annotation?: AnnotationDefinition;
}

export class Context {
  config: ObjectMap;
  document?: Document;

  // Top-level definitions
  namespace: NamespaceDefinition;
  interface: InterfaceDefinition;
  roles: RoleDefinition[];
  objects: ObjectDefinition[];
  enums: EnumDefinition[];
  unions: UnionDefinition[];
  inputs: InputValueDefinition[];

  // Drill-down definitions
  role?: RoleDefinition;
  object?: ObjectDefinition;
  operations?: OperationDefinition[];
  operation?: OperationDefinition;
  argumentsDef?: InputValueDefinition[];
  argument?: InputValueDefinition;
  argumentIndex?: number;
  fields?: FieldDefinition[];
  field?: FieldDefinition;
  fieldIndex?: number;
  enum?: EnumDefinition;
  enumValues?: EnumValueDefinition[];
  enumValue?: EnumValueDefinition;
  union?: UnionDefinition;
  input?: InputValueDefinition;
  annotations?: AnnotationDefinition[];
  annotation?: AnnotationDefinition;

  constructor(config: ObjectMap, document?: Document, other?: Context) {
    this.config = config || {};

    if (other != undefined) {
      this.document = other.document;
      this.namespace = other.namespace;
      this.interface = other.interface;
      this.roles = other.roles;
      this.enums = other.enums;
      this.objects = other.objects;
      this.unions = other.unions;
      this.inputs = other.inputs;
    } else {
      this.namespace = new NamespaceDefinition(
        undefined,
        undefined,
        new Name(undefined, "")
      );
      this.interface = new InterfaceDefinition();
      this.roles = new Array<RoleDefinition>();
      this.enums = new Array<EnumDefinition>();
      this.objects = new Array<ObjectDefinition>();
      this.unions = new Array<UnionDefinition>();
      this.inputs = new Array<InputValueDefinition>();
    }

    if (document != undefined) {
      this.document = document!;
      this.parseDocument();
    }
    autoBind(this);
  }

  clone({
    role,
    object,
    operations,
    operation,
    argumentsDef,
    argument,
    argumentIndex,
    fields,
    field,
    fieldIndex,
    enumDef,
    enumValues,
    enumValue,
    union,
    input,
    annotations,
    annotation,
  }: NamedParameters): Context {
    var context = new Context(this.config, undefined, this);

    context.role = role || this.role;
    context.object = object || this.object;
    context.operations = operations || this.operations;
    context.operation = operation || this.operation;
    context.argumentsDef = argumentsDef || this.argumentsDef;
    context.argument = argument || this.argument;
    context.argumentIndex = argumentIndex || this.argumentIndex;
    context.fields = fields || this.fields;
    context.field = field || this.field;
    context.fieldIndex = fieldIndex || this.fieldIndex;
    context.enum = enumDef || this.enum;
    context.enumValues = enumValues || this.enumValues;
    context.enumValue = enumValue || this.enumValue;
    context.union = union || this.union;
    context.input = input || this.input;
    context.annotations = annotations || this.annotations;
    context.annotation = annotation || this.annotation;

    return context;
  }

  private parseDocument(): void {
    this.document!.definitions.forEach((value) => {
      switch (true) {
        case value instanceof NamespaceDefinition:
          this.namespace = value as NamespaceDefinition;
          break;
        case value instanceof InterfaceDefinition:
          this.interface = value as InterfaceDefinition;
          break;
        case value instanceof RoleDefinition:
          this.roles.push(value as RoleDefinition);
          break;
        case value instanceof ObjectDefinition:
          this.objects.push(value as ObjectDefinition);
          break;
        case value instanceof EnumDefinition:
          this.enums.push(value as EnumDefinition);
          break;
        case value instanceof UnionDefinition:
          this.unions.push(value as UnionDefinition);
          break;
        case value instanceof InputValueDefinition:
          this.inputs.push(value as InputValueDefinition);
          break;
      }
    });
  }
}

export interface Visitor {
  visitDocumentBefore(context: Context): void;
  visitNamespace(context: Context): void;

  visitAllOperationsBefore(context: Context): void;
  visitInterfaceBefore(context: Context): void;
  visitInterface(context: Context): void;
  visitRolesBefore(context: Context): void;
  visitRoleBefore(context: Context): void;
  visitRole(context: Context): void;
  visitOperationsBefore(context: Context): void;
  visitOperationBefore(context: Context): void;
  visitOperation(context: Context): void;
  visitArgumentsBefore(context: Context): void;
  visitArgument(context: Context): void;
  visitArgumentsAfter(context: Context): void;
  visitOperationAfter(context: Context): void;
  visitOperationsAfter(context: Context): void;
  visitInterfaceAfter(context: Context): void;
  visitRoleAfter(context: Context): void;
  visitRolesAfter(context: Context): void;
  visitAllOperationsAfter(context: Context): void;

  visitObjectsBefore(context: Context): void;
  visitObjectBefore(context: Context): void;
  visitObject(context: Context): void;
  visitObjectFieldsBefore(context: Context): void;
  visitObjectField(context: Context): void;
  visitObjectFieldsAfter(context: Context): void;
  visitObjectAfter(context: Context): void;
  visitObjectsAfter(context: Context): void;

  visitEnumsBefore(context: Context): void;
  visitEnum(context: Context): void;
  visitEnumValuesBefore(context: Context): void;
  visitEnumValue(context: Context): void;
  visitEnumValuesAfter(context: Context): void;
  visitEnumsAfter(context: Context): void;

  visitDocumentAfter(_context: Context): void;

  //visitUnion(context: Context): void;
  //visitInput(context: Context): void;
}

export type Callbacks = Map<string, Map<string, VisitorCallback>>;
export type VisitorCallback = (_context: Context) => void;

export abstract class AbstractVisitor implements Visitor {
  callbacks: Callbacks = new Map<string, Map<string, VisitorCallback>>();

  setCallback(phase: string, purpose: string, callback: VisitorCallback): void {
    var purposes = this.callbacks.get(phase);
    if (purposes == undefined) {
      purposes = new Map<string, VisitorCallback>();
      this.callbacks.set(phase, purposes);
    }
    purposes.set(purpose, callback);
  }

  triggerCallbacks(context: Context, phase: string): void {
    var purposes = this.callbacks.get(phase);
    if (purposes == undefined) {
      return;
    }
    purposes.forEach((callback) => {
      callback(context);
    });
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
  public visitArgumentsBefore(context: Context): void {
    this.triggerArgumentsBefore(context);
  }
  public triggerArgumentsBefore(context: Context): void {
    this.triggerCallbacks(context, "ArgumentsBefore");
  }
  public visitArgument(context: Context): void {
    this.triggerArgument(context);
  }
  public triggerArgument(context: Context): void {
    this.triggerCallbacks(context, "Argument");
  }
  public visitArgumentsAfter(context: Context): void {
    this.triggerArgumentsAfter(context);
  }
  public triggerArgumentsAfter(context: Context): void {
    this.triggerCallbacks(context, "ArgumentsAfter");
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

  public visitObjectsBefore(context: Context): void {
    this.triggerObjectsBefore(context);
  }
  public triggerObjectsBefore(context: Context): void {
    this.triggerCallbacks(context, "ObjectsBefore");
  }
  public visitObjectBefore(context: Context): void {
    this.triggerObjectBefore(context);
  }
  public triggerObjectBefore(context: Context): void {
    this.triggerCallbacks(context, "ObjectBefore");
  }
  public visitObject(context: Context): void {
    this.triggerObject(context);
  }
  public triggerObject(context: Context): void {
    this.triggerCallbacks(context, "Object");
  }
  public visitObjectFieldsBefore(context: Context): void {
    this.triggerObjectFieldsBefore(context);
  }
  public triggerObjectFieldsBefore(context: Context): void {
    this.triggerCallbacks(context, "ObjectFieldsBefore");
  }
  public visitObjectField(context: Context): void {
    this.triggerObjectField(context);
  }
  public triggerObjectField(context: Context): void {
    this.triggerCallbacks(context, "ObjectField");
  }
  public visitObjectFieldsAfter(context: Context): void {
    this.triggerObjectFieldsAfter(context);
  }
  public triggerObjectFieldsAfter(context: Context): void {
    this.triggerCallbacks(context, "ObjectFieldsAfter");
  }
  public visitObjectAfter(context: Context): void {
    this.triggerObjectAfter(context);
  }
  public triggerObjectAfter(context: Context): void {
    this.triggerCallbacks(context, "ObjectAfter");
  }
  public visitObjectsAfter(context: Context): void {
    this.triggerObjectsAfter(context);
  }
  public triggerObjectsAfter(context: Context): void {
    this.triggerCallbacks(context, "ObjectsAfter");
  }

  public visitEnumsBefore(context: Context): void {
    this.triggerEnumsBefore(context);
  }
  public triggerEnumsBefore(context: Context): void {
    this.triggerCallbacks(context, "EnumsBefore");
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
  public visitEnumsAfter(context: Context): void {
    this.triggerEnumsAfter(context);
  }
  public triggerEnumsAfter(context: Context): void {
    this.triggerCallbacks(context, "EnumsAfter");
  }

  public visitDocumentAfter(context: Context): void {
    this.triggerDocumentAfter(context);
  }
  public triggerDocumentAfter(context: Context): void {
    this.triggerCallbacks(context, "DocumentAfter");
  }

  //public visitUnion(context: Context): void {}
  //public visitInput(context: Context): void {}
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
