import { Visitor } from "../ast";
//import { CamelCaseDirectiveNames } from "./camel_case_directive_names";
import { PascalCaseTypeNames } from "./pascal_case_type_names";
import { UniqueDirectiveNames } from "./unique_directive_names";
import { UniqueObjectNames } from "./unique_object_names";
import { UniqueOperationNames } from "./unique_operation_names";
import { UniqueParameterNames } from "./unique_parameter_names";
import { UniqueTypeFieldNames } from "./unique_type_field_names";
import { UniqueEnumValueNames } from "./unique_enum_value_names";
import { UniqueEnumValueIndexes } from "./unique_enum_value_indexes";
import { ValidEnumValueIndexes } from "./valid_enum_value_indexes";
import { KnownTypes } from "./known_types";
import { ValidDirectiveParameterTypes } from "./valid_directive_parameter_types";
import { ValidDirectiveRequires } from "./valid_directive_requires";
import { ValidDirectiveLocations } from "./valid_directive_locations";
import { ValidAnnotationArguments } from "./valid_annotation_arguments";
import { ValidAnnotationLocations } from "./valid_annotation_locations";

export interface ValidationRule {
  new (): Visitor;
}

export const CommonRules: Array<ValidationRule> = [
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
