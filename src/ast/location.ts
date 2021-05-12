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

export class Source {
  body: string;
  name: string;

  constructor(name: string, body?: string) {
    this.name = name;
    this.body = body || "";
  }

  public setBody(str: string): void {
    this.body = str;
  }
}
