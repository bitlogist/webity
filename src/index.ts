import * as fs from 'fs'
import { Express, Request, Response } from 'express'
import { parse } from 'node-html-parser'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

class Component {
  slot: boolean
  constructor(slot: boolean | undefined) {
    this.slot = slot ? slot : false
  }
}

type DynamicHTML = {
  html: string,
  component?: Component,
}

function modify(script: string, html: string) {
  html = html.replace(script, script.replace(/return (.|\n)*/g, ''))
  html = html.replace(script, script.replace(/(var|const|let) \w+[ ]*=[ ]*\$import\(("|'|`).+("|'|`)\);*/g, ''))
  return html
}

function execute(code: string, locals: Record<string, any>, dir: string) {
  try {
    const preset = {
      process: {
        version: process.version,
      },
      eval: null,
      Function: null,
      include: (file: string) => render(dir, file, locals).html,
      element: (tag: string, text: string, attributes: Record<string, string>) => `<${tag} ${Object.entries(attributes).join(' ').replace(',', '="') + (Object.entries(attributes).length ? '"' : '')}>${text}</${tag}>`,
      loop: (items: string[], callback: (item: string, i: number) => any) => {
          let x: any = []
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            x.push(callback(item, i))
          }
          return x.join('')
        }
    }
    const f = new Function(...Object.keys(preset), ...Object.keys(locals), `return ${code.match(/(?<=%{)(.|\n)+?(?=}%)/g)}`)
    return f(...Object.values(preset), ...Object.values(locals))
  } catch (e) {
    console.log(e)
    return ''
  }
}

export function render(dir: string = 'views', file: string, locals: Record<string, any>, debug?: boolean): DynamicHTML {
  const root = '$'
  if (file.startsWith(root)) {
    dir = dir.split('/')[0]
    file = file.replace(root, '')
  }
  if (!file) file = 'index.html'
  if (!file.endsWith('.html')) file += '.html'
  if (debug) console.log(dir, file)
  let html: string = fs.readFileSync(`${dir}/${file}`, 'utf-8')
  let component: Component = new Component(false)
  let imports: Record<string, any> = {}
  let document = parse(html)
  const lib = {
    $import: (file: string) => {
      const dynamic = render(dir, file, locals, debug)
      imports[file] = dynamic.component
      const element = document.querySelector(file.replace(/\..*/g, '').toLowerCase())
      if (element) {
        html = html.replace(element.toString(), dynamic.html.replace('<slot/>', element.innerHTML))
        document = parse(html)
      }
      return dynamic.component
    },
    $export: (item: any) => component = item,
    Component,
  }
  document.querySelectorAll('script[webity]').forEach(script => {
    try {
      const f = new Function(...Object.keys(lib), `${script.textContent}`)
      const output = f(...Object.values(lib))
      if (debug) console.log(output)
    } catch(e) {
      console.log(e)
    }
    html = modify(script.toString(), html)
  })
  const matches = Array.from(html.matchAll(/%{(.|\n)+?}%/g))
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const rendered = execute(match[0], locals, dir)
    html = html.replace(match[0], rendered)
    if (debug) console.log(`SUCCESS! \x1b[32m${match[0]}\x1b[0m -> ${rendered}`)
  }
  if (!document.querySelector('script[main]')) 
    html = html.replace(
      /%[ ]*main[ ]*%/g, 
      `<script main>
        class Component {
          constructor(slot) {
            this.slot = slot
          }
        }
        $import = file => file
        $export = file => file
      </script>`
    )
  return {
    html,
    component,
  }
}

export class Router {
  dir: string = 'views'
  app: Express

  constructor(app: Express, dir?: string) {
    this.app = app
    if (dir) this.dir = dir
  }

  use(...args: any[]) {
    this.app.use(...args)
  }

  listen(...args: any[]) {
    console.log('LOADING!')
    this.app.listen(...args)
  }

  listRoutes(path: string): string[] {
    let valid = false
    const routes: string[] = []
    const folders = fs.readdirSync(path).filter(file => {
      if (file === 'index.html') valid = true
      return !file.includes('.')
    })
    if (!folders.length) return [path]
    if (valid) {
      for (const folder of folders) {
        routes.push(...this.listRoutes(path + '/' + folder))
      }
    }
    return [path, ...routes]
  }

  respond(path: string, method: Method, locals: Record<string, any>): Express {
    this.app[method]('/' + path.replace(new RegExp(`${this.dir}[\\/]?`, 'g'), ''), (req: Request, res: Response) => {
      const { params, query } = req
      let info: Record<string, any> = {
        params,
        query,
      }
      info = Object.fromEntries([...Object.entries(info), ...Object.entries(locals)]) // append locals or overwrite info
      res.send(render(path, '', info, true).html)
    })
    return this.app
  }

  route(path: string, method: Method, locals: Record<string, any>): string[] {
    const routes = this.listRoutes(this.dir + path)
    for (const route of routes) {
      this.respond(route, method, locals)
    }
    try {
      fs.readFileSync(this.dir + path + '/index.html')
      this.respond(path, method, locals)
    } catch (e) {
      console.log(e)
      console.log(`ERROR! \xb1[41m${path}\xb1[0m does not contain a \x1b[4mindex.html file\xb1[0m`)
    }
    return routes
  }
}