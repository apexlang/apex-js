export class Source {
  body: string = ""; // byte array
  name: string = "WIDL";

  constructor(name: string) {
    this.name = name;
  }

  public setBody(str: string): void {
    this.body = str;
  }
}
