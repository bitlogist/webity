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

The `Router` wrapper class creates a webity router on top of an `Express` applicaiton. The router automatically renders pages according to the route. You can always access `Router.app` to perform other express methods. 

```js
const app = express()
const router = new Router(app)
```

## Structure

Always place an `index.html` file in your folders. **Never** place an HTML file in your *static* express folder. This is an example that follows the recommended folder structure.

- public/
  - style.css
  - script.js
- views/
  - about/
    - index.html
  - index.html
  - page.html
  - meta.html
- index.js

## Overview

The Webity SSR engine supports pure HTML. There is no need to use other file extensions or syntax highlighters!

### Server Variables

Variables can be rendered by the server and sent as HTML files.

There are two options. The `Router` class or the `render` function. 

```js
const app = express()
const router = new Router(app)

router.use(express.static('public'))

router.route('', 'get', { message: 'Hello!', todo: ['First', 'Second'] })

router.listen(3000)
```

The render function gives you more control but is more manual.

```js
const app = express()

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.send(render('views', 'index.html', { message: 'Hello!', todo: ['First', 'Second'] }))
})

// every route needs to be configured manually

app.listen(3000)
```

The `$` symbol indicates that the `file` parameter of the `include(file)` function is an absolute path. Anything inside `%{}%` brackets is rendered by the server.
> **Warning** Using regular expressions or single-line `//` comments  is not recommended

```html
<!-- returns 'Hello!' -->
%{ message }%
<!-- renders main.html from absolute path -->
%{ include('$main.html') }%
<!-- renders main.html from relative path -->
%{ include('main.html') }%
```

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
  <!-- required for webity scripts -->
  %main%
</head>
<body>
  <div id="root">
    <!-- rendered content will go in #root -->
  </div>
  <template>
    <page list="['A', 'B']">
      Hello
    </page>
    <page list="['C', 'D']">
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

The `page.html` file contains the definitions for the exported component. Any attribute inside `{}` curly brackets will be replaced with its value. More advanced rendering will be available later. Reactivity will also be added to components in the future.

```html
<!-- page.html -->
<template>
  <slot>
    <!-- slots will be replaced with the innerHTML of a <page></page> element -->
  </slot>
  <ul>
    %{ loop(todo, item => element('li', item, {})) }% <!-- SSR renders <li></li> elements -->
  </ul>
  <ul>
    <li web-for="item, i in list">
      {{ item }}
    </li>
  </ul>
</template>
<!-- webity scripts are rendered -->
<script webity>
  class Page extends Component {
    constructor() {
      super()
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