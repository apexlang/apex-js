# Apex Language Parser

This library will parse `.apex` files into an AST. Refer to the docs
[docs](https://docs.apexlang.io) for more information.

## Adding the package

```sh
#deno
$ deno add jsr:@apexlang/core

# npm (one of the below, depending on your package manager)
npx jsr add @apexlang/core
yarn dlx jsr add @apexlang/core
pnpm dlx jsr add @apexlang/core
bunx jsr add @apexlang/core
```

## Usage (ESM module only)

```js
import { parse, validate } from "@apexlang/core";
import { CommonRules } from "@apexlang/core/rules";
import { AbstractVisitor, Context, Writer } from "@apexlang/core/ast";

const source = `
namespace "mandelbrot"

interface {
  update(width: u32, height: u32, limit: u32): [u16]
}`;

const doc = parse(source, undefined, { noLocation: true });
const errors = validate(doc, ...CommonRules);

if (errors.length > 0) {
  errors.map((e) => console.log(e.message));
} else {
  const context = new Context({});
  const writer = new Writer();
  const visitor = new AbstractVisitor();
  visitor.setCallback("Operation", "", function (context) {
    const oper = context.operation;
    if (oper == undefined || oper.name.value != "update") {
      return;
    }
    console.log(oper);
  });
  doc.accept(context, visitor);
}
```

## License

[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)
