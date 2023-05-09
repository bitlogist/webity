# Webity

A pretty overpowered SSR engine for express!

## Installation

```sh
npm install webity
```

## Getting Started

Webity is a hybrid typescript library. It supports `import` and `require` statements.

### ESM

```js
import { render, Router } from 'webity'
import express from 'express'
```

### CJS

```js
const { render, Router } = require('webity')
const express = require('express')
```

The `Router` wrapper class creates a webity router on top of an `Express` applicaiton. The router automatically renders pages according to the route.

```js
const app = express()
const router = new Router(app)
```

## Overview

The Webity SSR engine supports pure HTML. There is no need to use other file extensions or syntax highlighters!

### Server Variables

Variables can be rendered by the server and sent as HTML files.

```js
const { render, Router } = require('./dist/cjs/index.cjs')
const express = require('express')

const app = express()
const router = new Router(app)

router.use(express.static('public'))

router.route('', 'get', { message: 'Hello!', todo: ['First', 'Second'] })

router.listen(3000)
```

Anything inside `%{}%` brackets is rendered by the server.
> **Warning** Using regular expressions or single-line `//` comments  is not recommended

### Components

Any `script` tag to do with components needs a **webity** attribute.

Components are more advanced and are designed to work with the client. The server configures components before they are shipped to the client. The `$import(file)` function imports a component from another HTML file. The first HTML tag with the same name as the component's file name (due to `querySelector`) will be replaced with the component's HTML. For example, the `$import('page')` function in the **webity** script of `index.html` will read `page.html` in the same directory and replace all `<page></page>` elements in `index.html` with the template of `page.html`. Anything inside the `<page></page>` elements will replace the `<slot/>` of `page.html` if it has a slot. 

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- views/meta.html is rendered -->
  %{ include('$meta.html') }%
  <title>%{ message }%</title>
  %main%
</head>
<body>
  <div id="root">
    <!-- rendered content will go in #root -->
  </div>
  <template>
    <page>
      Hello
    </page>
    <page>
      World
    </page>
  </template>
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
<template>
  <slot>
    <!-- slots will be replaced with the innerHTML of a <page></page> element -->
  </slot>
  <!-- SSR renders <li></li> elements -->
  <ul>
    %{ loop(todo, item => element('li', item, {})) }%
  </ul>
</template>
<!-- webity scripts are rendered -->
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

The `include(file)` function can render other pages in a file.

```html
<!-- meta.html -->
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```