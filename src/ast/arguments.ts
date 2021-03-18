import { Location } from "./location";
import { kinds } from "./kinds";
import { Name } from "./name";
import { Value } from "./values";
import { AbstractNode } from "./node";

// Argument implements Node
export class Argument extends AbstractNode {
  name: Name;
  value: Value;

  constructor(loc: Location | undefined, name: Name, value: Value) {
    super(kinds.Argument, loc);
    this.name = name || undefined;
    this.value = value || undefined;
  }
}
