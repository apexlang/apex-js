import { Visitor } from "../ast/index.js";
import { NamespaceFirst } from "./namespace_first.js";
import { SingleNamespaceDefined } from "./single_namespace_defined.js";
import { SingleInterfaceDefined } from "./single_interface_defined.js";
//import { CamelCaseDirectiveNames } from "./camel_case_directive_names.js";
import { PascalCaseTypeNames } from "./pascal_case_type_names.js";
import { UniqueDirectiveNames } from "./unique_directive_names.js";
import { UniqueObjectNames } from "./unique_object_names.js";
import { UniqueOperationNames } from "./unique_operation_names.js";
import { UniqueParameterNames } from "./unique_parameter_names.js";
import { UniqueTypeFieldNames } from "./unique_type_field_names.js";
import { UniqueEnumValueNames } from "./unique_enum_value_names.js";
import { UniqueEnumValueIndexes } from "./unique_enum_value_indexes.js";
import { ValidEnumValueIndexes } from "./valid_enum_value_indexes.js";
import { KnownTypes } from "./known_types.js";
import { ValidDirectiveParameterTypes } from "./valid_directive_parameter_types.js";
import { ValidDirectiveRequires } from "./valid_directive_requires.js";
import { ValidDirectiveLocations } from "./valid_directive_locations.js";
import { ValidAnnotationArguments } from "./valid_annotation_arguments.js";
import { ValidAnnotationLocations } from "./valid_annotation_locations.js";

export interface ValidationRule {
  new (): Visitor;
}

export const CommonRules: Array<ValidationRule> = [
  NamespaceFirst,
  SingleNamespaceDefined,
  SingleInterfaceDefined,
  //CamelCaseDirectiveNames,
  PascalCaseTypeNames,
  UniqueDirectiveNames,
  UniqueObjectNames,
  UniqueOperationNames,
  UniqueParameterNames,
  UniqueTypeFieldNames,
  UniqueEnumValueNames,
  UniqueEnumValueIndexes,
  ValidEnumValueIndexes,
  KnownTypes,
  ValidDirectiveParameterTypes,
  ValidDirectiveRequires,
  ValidDirectiveLocations,
  ValidAnnotationArguments,
  ValidAnnotationLocations,
];
