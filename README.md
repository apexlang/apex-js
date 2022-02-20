# Apex Language Parser

This library will parse `.apex` files into an AST. Refer to the docs [docs](https://docs.apexlang.io) for more information.

## Installation

```sh
$ npm install @apexlang/core
```

## Usage (node)

```js
const Apex = require("@apexlang/core");

const source = `
namespace "mandelbrot"

interface {
  update(width: u32, height: u32, limit: u32): [u16]
}`;

const doc = Apex.parse(source, { noLocation: true });

console.log(JSON.stringify(doc));
```

## Usage (browser)

```html
<script
  type="text/javascript"
  src="https://cdn.jsdelivr.net/npm/@apexlang/apex-js/dist/standalone.min.js"
></script>
<script type="text/javascript">
  const source = `
namespace "mandelbrot"

interface {
  update(width: u32, height: u32, limit: u32): [u16]
}`;

  const doc = Apex.parse(source, { noLocation: true });

  console.log(JSON.stringify(doc));
</script>
```

## License

[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)