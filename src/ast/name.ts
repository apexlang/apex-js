import { kinds } from "./kinds";
import { Location } from "./location";
import { AbstractNode } from "./node";

// Name implements Node
export class Name extends AbstractNode {
  value: string;

  constructor(doc: Location | undefined, value: string) {
    super(kinds.Name, doc);
    this.value = value || "";
  }
}
