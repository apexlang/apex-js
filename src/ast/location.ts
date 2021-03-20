import { Source } from "./source";

export class Location {
  start: number;
  end: number;
  source: Source;

  constructor(start: number, end: number, source: Source) {
    this.start = start || 0;
    this.end = end || 0;
    this.source = source || null;
  }
}
