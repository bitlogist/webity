# Webity

A pretty overpowered SSR engine for express!

## Installation

```sh
npm install webity
```

## SSR

The SSR engine supports pure HTML. There is no need to use other file extensions or syntax highlighters!

### Server Variables

Variables can be rendered by the server and sent as HTML files.

```js
import { render, Router } from './dist/esm/index.mjs'
import express from 'express'

const app = express()
const router = new Router(app) // same as new Router(app, 'views')

router.use(express.static('public'))

router.route('', 'get', { message: 'Hello!', todo: ['First', 'Second'] }) // app.get('/') and renders views/index.html

router.listen(3000) // you can always access router.app if you need to
```

### Components

Any `script` tag to do with components needs a **webity** attribute.

Components are more advanced and are designed to work with the client. The server configures components before they are shipped to the client. The `$import(file)` function imports a component from another HTML file. The first HTML tag with the same name as the component's file name (due to `querySelector`) will be replaced with the component's HTML. For example, the `$import('page')` function in the **webity** script of `index.html` will read `page.html` in the same directory and replace the first `<page></page>` in `index.html` with the contents of `page.html`. Anything inside the `<page></page>` element will replace the `<slot/>` of `page.html` if it has a slot. 

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  %{ include('$meta.html') }%
  <title>%{ message }%</title>
  %main%
</head>
<body>
  <!-- $import('page') replaces the page tag with the component -->
  <page>
    <!-- innerHTML replaces <slot/> -->
    Hello!
  </page>
  <script webity>
    const Page = $import('page')
    const page = new Page()
    page.sayHello()
  </script>
</body>
</html>
```

The `page.html` file contains the definitions for the exported component. Reactivity will be added to components in the future.

```html
<!-- page.html -->
<!-- innerHTML of <page></page> replaces the slot -->
<slot/>
<!-- JavaScript renders HTML -->
%{ loop(todo, item => element('li', item, {})) }%
<script webity>
  class Page extends Component {
    constructor() {
      super(true)
    }

    sayHello() {
      console.log('Hello!')
    }
  }
  $export(Page)
</script>
```