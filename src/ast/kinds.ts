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
  Stream = "Stream",

  // Definitions
  NamespaceDefinition = "NamespaceDefinition",
  ImportDefinition = "ImportDefinition",
  AliasDefinition = "AliasDefinition",
  InterfaceDefinition = "InterfaceDefinition",
  OperationDefinition = "OperationDefinition",
  ParameterDefinition = "ParameterDefinition",
  TypeDefinition = "TypeDefinition",
  FieldDefinition = "FieldDefinition",
  UnionDefinition = "UnionDefinition",
  UnionMemberDefinition = "UnionMembersDefinition",
  EnumDefinition = "EnumDefinition",
  EnumValueDefinition = "EnumValueDefinition",
  DirectiveDefinition = "DirectiveDefinition",
  FunctionDefinition = "FunctionDefinition",
}
