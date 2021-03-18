import { kinds } from "./kinds";
import { StringValue, Value } from "./values";
import { AbstractNode } from "./node";
import { Definition } from "./definitions";
import { Annotation } from "./annotations";
import { Named, Type } from "./types";
import { Location } from "./location";
import { Name } from "./name";
import { Context, Visitor } from "./visitor";

// DescribableNode are nodes that have descriptions associated with them.
export interface DescribableNode {
  GetDescription(): StringValue;
}
export interface TypeDefinition extends DescribableNode {
  getKind(): string;
  getLoc(): Location;
}

export interface TypeSystemDefinition {
  getKind(): string;
  getLoc(): Location;
}

// export class SchemaDefinition extends AbstractNode {
//   annotations: Annotation[];
//   operationTypes: OperationDefinition[];

//   constructor(
//     loc: Location | undefined,
//     annotations: Annotation[],
//     opType: OperationDefinition[]
//   ) {
//     super(kinds.SchemaDefinition, loc);
//     this.annotations = annotations;
//     this.operationTypes = opType;
//   }
// }

// export class OperationTypeDefinition extends AbstractNode {
//   operation: string;
//   type: Named;

//   constructor(loc: Location | undefined, op: string, type: Named) {
//     super(kinds.OperationTypeDefinition, loc);
//     this.operation = op;
//     this.type = type;
//   }
// }

export class NamespaceDefinition extends AbstractNode {
  description?: StringValue;
  name: Name;
  annotations?: Annotation[];

  constructor(
    loc: Location | undefined,
    desc: StringValue | undefined,
    name: Name,
    annotations?: Annotation[]
  ) {
    super(kinds.NamespaceDefinition, loc);
    this.description = desc;
    this.name = name;
    this.annotations = annotations || [];
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitNamespace(context);
  }
}

export class ObjectDefinition extends AbstractNode {
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
    super(kinds.ObjectDefinition, loc);
    this.name = name;
    this.description = desc;
    this.interfaces = interfaces;
    this.annotations = annotations;
    this.fields = fields;
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitObjectBefore(context);
    visitor.visitObject(context);

    context = context.clone({ fields: context.object!.fields });
    visitor.visitObjectFieldsBefore(context);
    context.fields!.map((field, index) => {
      field.accept(context.clone({ field: field, fieldIndex: index }), visitor);
    });
    visitor.visitObjectFieldsAfter(context);

    visitor.visitObjectAfter(context);
  }
}

export class OperationDefinition extends AbstractNode {
  name: Name;
  description: StringValue | undefined;
  arguments: InputValueDefinition[];
  type: Type;
  annotations: Annotation[];
  unary: boolean;

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    args: InputValueDefinition[],
    type: Type,
    annotations: Annotation[],
    unary: boolean
  ) {
    super(kinds.OperationDefinition, loc);
    this.name = name;
    this.description = desc;
    this.arguments = args;
    this.type = type;
    this.annotations = annotations;
    this.unary = unary;
  }

  public isUnary(): boolean {
    return this.unary && this.arguments && this.arguments.length == 1;
  }

  public unaryOp(): InputValueDefinition {
    return this.arguments[0];
  }

  mapTypeToTranslation(
    typeTranslation: (inp: Type) => string
  ): Map<String, String> {
    const mp = new Map<String, String>();
    if (this.unary) {
      mp.set(this.unaryOp().name.value, typeTranslation(this.unaryOp().type));
    } else {
      this.arguments.forEach((arg) => {
        mp.set(arg.name.value, typeTranslation(arg.type));
      });
    }
    return mp;
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitOperationBefore(context);
    visitor.visitOperation(context);

    context = context.clone({ argumentsDef: context.operation!.arguments });
    visitor.visitArgumentsBefore(context);
    context.argumentsDef!.map((argument, index) => {
      argument.accept(
        context.clone({ argument: argument, argumentIndex: index }),
        visitor
      );
    });
    visitor.visitArgumentsAfter(context);

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
    kinds: string,
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    type: Type,
    defaultVal: Value | undefined,
    annotations: Annotation[]
  ) {
    super(kinds, loc);
    this.name = name;
    this.description = desc;
    this.type = type;
    this.default = defaultVal;
    this.annotations = annotations;
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
    super(
      kinds.FieldDefinition,
      loc,
      name,
      desc,
      type,
      defaultVal,
      annotations
    );
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitObjectField(context);
  }
}

export class InputValueDefinition extends ValuedDefinition {
  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    type: Type,
    defaultVal: Value | undefined,
    annotations: Annotation[]
  ) {
    super(
      kinds.FieldDefinition,
      loc,
      name,
      desc,
      type,
      defaultVal,
      annotations
    );
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitArgument(context);
  }
}

export class InterfaceDefinition extends AbstractNode {
  description?: StringValue;
  operations: OperationDefinition[];
  annotations: Annotation[];

  constructor(
    loc?: Location,
    desc?: StringValue,
    op?: OperationDefinition[],
    annotations?: Annotation[]
  ) {
    super(kinds.InterfaceDefinition, loc);
    this.description = desc;
    this.operations = op || [];
    this.annotations = annotations || [];
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

    visitor.visitInterfaceAfter(context);
  }
}

export class RoleDefinition extends AbstractNode {
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
    super(kinds.RoleDefinition, loc);
    this.name = name;
    this.description = desc;
    this.operations = op || [];
    this.annotations = annotations || [];
  }

  public accept(context: Context, visitor: Visitor): void {
    visitor.visitRoleBefore(context);
    visitor.visitRole(context);

    context = context.clone({ operations: context.role?.operations });
    visitor.visitOperationsBefore(context);
    context.operations!.map((operation) => {
      operation.accept(context.clone({ operation: operation }), visitor);
    });
    visitor.visitOperationsAfter(context);

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
    super(kinds.UnionDefinition, loc);
    this.name = name;
    this.description = desc;
    this.annotations = annotations;
    this.types = types;
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
    super(kinds.EnumDefinition, loc);
    this.name = name;
    this.description = desc;
    this.annotations = annotations;
    this.values = values;
  }
}

export class EnumValueDefinition extends AbstractNode implements Definition {
  name: Name;
  description?: StringValue;
  annotations: Annotation[];

  constructor(
    loc: Location | undefined,
    name: Name,
    desc: StringValue | undefined,
    annotations: Annotation[]
  ) {
    super(kinds.EnumValueDefinition, loc);
    this.name = name;
    this.description = desc;
    this.annotations = annotations;
  }
}
