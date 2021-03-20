import { kinds } from "./kinds";
import { Location } from "./location";
import { Argument } from "./arguments";
import { AbstractNode } from "./node";
import { Name } from "./name";

// Annotation implements Node
export class Annotation extends AbstractNode {
  name: Name;
  arguments: Argument[];

  constructor(loc: Location | undefined, name: Name, args?: Argument[]) {
    super(kinds.Annotation, loc);
    this.name = name;
    this.arguments = args || [];
  }
}
