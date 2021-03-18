import { Location } from "./location";
import { AbstractNode } from "./node";
import { Name } from "./name";
import { StringValue } from "./values";
import { InputValueDefinition } from "./type_definitions";
import { kinds } from "./kinds";

export interface Definition {
  getKind(): string;
  getLoc(): Location | undefined;
}

export class AnnotationDefinition extends AbstractNode implements Definition {
  name: Name;
  description?: StringValue;
  arguments: InputValueDefinition[];
  locations: Name[];

  constructor(
    loc: Location | undefined,
    name: Name,
    description: StringValue | undefined,
    args: InputValueDefinition[],
    locations: Name[]
  ) {
    super(kinds.AnnotationDefinition, loc);
    this.name = name;
    this.description = description;
    this.arguments = args;
    this.locations = locations;
  }

  getDescription(): StringValue | undefined {
    return this.description;
  }
}
