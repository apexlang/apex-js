/*
Copyright 2022 The Apex Authors.

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

import { Visitor } from "../ast/index.js";
import { NamespaceFirst } from "./namespace_first.js";
import { SingleNamespaceDefined } from "./single_namespace_defined.js";
//import { CamelCaseDirectiveNames } from "./camel_case_directive_names.js";
import { PascalCaseTypeNames } from "./pascal_case_type_names.js";
import { UniqueDirectiveNames } from "./unique_directive_names.js";
import { UniqueObjectNames } from "./unique_object_names.js";
import { UniqueFunctionNames } from "./unique_function_names.js";
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
  //CamelCaseDirectiveNames,
  PascalCaseTypeNames,
  UniqueDirectiveNames,
  UniqueObjectNames,
  UniqueFunctionNames,
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
