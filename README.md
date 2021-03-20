# Web Assembly IDL (widl) Parser

This library will parse `.widl` files into an AST. Refer to the docs [docs](https://wapc.github.io/widl-js) for more information.

## Installation

```sh
$ npm install @wapc/widl
```

## Usage (node)

```js
const widl = require("@wapc/widl");

const source = `
namespace "mandelbrot"

interface {
  update(width: u32, height: u32, limit: u32): [u16]
}`;

const doc = widl.parse(source, { noLocation: true });

console.log(JSON.stringify(doc));
```

## Usage (browser)

```html
<script
  type="text/javascript"
  src="https://cdn.jsdelivr.net/npm/@wapc/widl/dist/standalone.min.js"
></script>
<script type="text/javascript">
  const source = `
namespace "mandelbrot"

interface {
  update(width: u32, height: u32, limit: u32): [u16]
}`;

  const doc = widl.parse(source, { noLocation: true });

  console.log(JSON.stringify(doc));
</script>
```

## License

[Apache License 2.0](https://choosealicense.com/licenses/apache-2.0/)