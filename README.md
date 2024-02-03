# Apex Language Parser

This library will parse `.apex` files into an AST. Refer to the docs
[docs](https://docs.apexlang.io) for more information.

## Installation

```sh
$ npm install @apexlang/core
```

## Usage (node v12+)

```js
import { parse, validate } from "@apexlang/core/mod.js";
import { CommonRules } from "@apexlang/core/rules/mod.js";
import { AbstractVisitor, Context, Writer } from "@apexlang/core/ast/mod.js";

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

## Usage (browser)

```html
<script type="module">
import { parse, validate } from 'https://cdn.jsdelivr.net/npm/@apexlang/core/esm/mod.js';
import { CommonRules } from 'https://cdn.jsdelivr.net/npm/@apexlang/core/esm/rules/mod.js';
import { Context, Writer, AbstractVisitor } from 'https://cdn.jsdelivr.net/npm/@apexlang/core/esm/ast/mod.js';

const source = `
namespace "mandelbrot"

interface {
  update(width: u32, height: u32, limit: u32): [u16]
}`;

const doc = parse(source, undefined, { noLocation: true });
const errors = validate(doc, ...CommonRules);

if (errors.length > 0) { 
  errors.map(e => console.log(e.message));
} else {
  const context = new Context({});
  const writer = new Writer();
  const visitor = new AbstractVisitor();
  visitor.setCallback("Operation", "", function(context) {
    const oper = context.operation;
    if (oper == undefined || oper.name.value != "update") {
      return;
    }
    console.log(oper);
  });
  doc.accept(context, visitor);
}
</script>
```

## License

[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)
