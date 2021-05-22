export enum Kind {
  // Nodes
  Document = "Document",
  Name = "Name",
  Annotation = "Annotation",
  Argument = "Argument",
  DirectiveRequire = "DirectiveRequire",
  ImportName = "ImportName",

  // Values
  IntValue = "IntValue",
  FloatValue = "FloatValue",
  StringValue = "StringValue",
  BooleanValue = "BooleanValue",
  EnumValue = "EnumValue",
  ListValue = "ListValue",
  MapValue = "MapValue",
  ObjectValue = "ObjectValue",
  ObjectField = "ObjectField",

  // Types
  Named = "Named",
  ListType = "ListType",
  MapType = "MapType",
  Optional = "Optional",

  // Definitions
  NamespaceDefinition = "NamespaceDefinition",
  ImportDefinition = "ImportDefinition",
  AliasDefinition = "AliasDefinition",
  InterfaceDefinition = "InterfaceDefinition",
  RoleDefinition = "RoleDefinition",
  OperationDefinition = "OperationDefinition",
  ParameterDefinition = "ParameterDefinition",
  TypeDefinition = "TypeDefinition",
  FieldDefinition = "FieldDefinition",
  UnionDefinition = "UnionDefinition",
  EnumDefinition = "EnumDefinition",
  EnumValueDefinition = "EnumValueDefinition",
  DirectiveDefinition = "DirectiveDefinition",
}
