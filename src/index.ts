import * as fs from 'fs'
import { Express, Request, Response } from 'express'
import { parse } from 'node-html-parser'

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
export type RouteData = Record<string, any> | ((req: Request, res: Response) => Record<string, any>)

class Component {
  constructor() {}
}

type DynamicHTML = {
  html: string,
  component?: Component,
  scriptList?: string[],
}

const root = '$'
const maxLength = 32
const componentPreset = {
  element: (tag: string, innerHTML: string, attributes: Record<string, string>) => {
    let s = ''
    for (const [key, value] of Object.entries(attributes)) {
      s += ` ${key}="${value}"`
    }
    return `<${tag + s}>${innerHTML}</${tag}>`
  },
  loop: (items: string[], callback: (item: string, i: number) => any) => {
    let x: any = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      x.push(callback(item, i))
    }
    return x.join('')
  },
}

function modify(script: string, html: string) {
  html = html.replace(script, script.replace(/return (.|\n)*/g, ''))
  html = html.replace(script, script.replace(/(var|const|let) \w+[ ]*=[ ]*\$import\(("|'|`).+("|'|`)\);*/g, ''))
  return html
}

function execute(code: string, locals: Record<string, any>, dir: string): string {
  try {
    const preset = {
      process: {
        version: process.version,
      },
      eval: null,
      Function: null,
      include: (file: string) => render(dir, file, locals).html,
      element: (tag: string, innerHTML: string, attributes: Record<string, string>) => {
        let s = ''
        for (const [key, value] of Object.entries(attributes)) {
          s += ` ${key}="${value}"`
        }
        return `<${tag + s}>${innerHTML}</${tag}>`
      },
      loop: (items: string[], callback: (item: string, i: number) => any) => {
        let x: any = []
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          x.push(callback(item, i))
        }
        return x.join('')
      },
    }
    const f = new Function(...Object.keys(preset), ...Object.keys(locals), `return ${code.match(/(?<=%{)(.|\n)+?(?=}%)/g)}`)
    return f(...Object.values(preset), ...Object.values(locals)).toString()
  } catch (e) {
    console.log(e)
    return ''
  }
}

function safeEval(code: string, params: Record<string, any>) {
  return (new Function(...Object.keys(params), `return ${code}`))(...Object.values(params))
}

export function render(dir: string = 'views', file: string, locals: Record<string, any>, debug?: boolean): DynamicHTML {
  if (file.startsWith(root)) {
    dir = dir.split('/')[0]
    file = file.replace(root, '')
  }
  if (!file) file = 'index.html'
  if (!file.endsWith('.html')) file += '.html'
  if (debug) console.log(`LOADING! \x1b[34m${file}\x1b[0m from ${dir}`)
  let html: string = fs.readFileSync(`${dir}/${file}`, 'utf-8')
  let component: Component = new Component()
  let document = parse(html)
  let scriptList: string[] = []
  const lib = {
    $import: (file: string) => {
      const dynamic = render(dir, file, locals, debug)
      if (!dynamic.scriptList || !dynamic.component) return false
      const dom = parse(dynamic.html)
      const importedTemplate = dom.querySelector('template')?.innerHTML
      const slot = dom.querySelector('slot')?.toString() || ''
      const root = document.querySelector('#root')
      const template = document.querySelector('template')
      const elements = document.querySelectorAll('template ' + file.replace(/(\$|\..*)/g, '').toLowerCase())
      if (debug) console.log(`LOADING! \x1b[34m${file}\x1b[0m components -> \x1b[34m${elements.length}\x1b[0m`)
      for (const element of elements) {
        if (template && importedTemplate) {
          let content = importedTemplate
          const { attributes } = element
          for (const [attribute, value] of Object.entries(attributes)) {
            attributes[attribute] = safeEval(value, {})
          }
          for (const match of Array.from(content.matchAll(/{{(.|\n)+?}}/g))) {
            const f = new Function(...Object.keys(componentPreset), ...Object.keys(attributes), `return ${match[0].match(/(?<={{)(.|\n)+?(?=}})/g)}`)
            let rendered: any
            try {
              rendered = f(...Object.values(componentPreset), ...Object.values(attributes))
            } catch (e) {
              console.log(e)
              rendered = ''
            }
            content = content.replace(match[0], rendered)
          }
          for (const match of dom.querySelectorAll('script[inline]')) {
            const f = new Function(...Object.keys(componentPreset), ...Object.keys(attributes), `return ${match.innerHTML}`)
            let rendered: any
            try {
              rendered = f(...Object.values(componentPreset), ...Object.values(attributes))
            } catch (e) {
              console.log(e)
              rendered = ''
            }
            content = content.replace(match.toString(), rendered)
          }
          template.innerHTML = template.innerHTML.replace(element.toString(), content.replace(slot.toString(), element.innerHTML))
        } else if (debug) console.log('WARNING! \x1b[33mtemplate tags missing\x1b[0m')
      }
      if (root && template) html = html.replace(root.toString(), template.innerHTML)
      document = parse(html)
      const firstScript = document.querySelector('script[webity]')?.toString() || ''
      let s = firstScript
      for (const script of dynamic.scriptList) {
        s = script + s
      }
      html = html.replace(firstScript, s)
      return dynamic.component
    },
    $export: (item: any) => component = item,
    Component,
  }
  document.querySelectorAll('script[webity]').forEach(script => {
    try {
      const f = new Function(...Object.keys(lib), `${script.textContent}`)
      const output = f(...Object.values(lib))
    } catch(e) {
      console.log(e)
    }
    scriptList.push(modify(script.toString(), script.toString()))
    html = modify(script.toString(), html)
  })
  const matches = Array.from(html.matchAll(/%{(.|\n)+?}%/g))
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const rendered: string = execute(match[0], locals, dir)
    const shortened: string = rendered.length > maxLength ? rendered.substring(0, maxLength).replace('\n', '') + ` ... ${rendered.length - maxLength} more characters` : rendered.replace('\n', '')
    html = html.replace(match[0], rendered)
    if (debug) console.log(`SUCCESS! \x1b[32m${match[0]}\x1b[0m -> ${shortened}`)
  }
  if (!document.querySelector('script[main]')) 
    html = html.replace(
      /%[ ]*main[ ]*%/g, 
      `<script main>
        class Component {
          constructor() {}
        }
        $import = file => file
        $export = file => file
      </script>`
    )
  return {
    html,
    component,
    scriptList,
  }
}

export class Router {
  dir: string = 'views'
  app: Express
  regex: RegExp = new RegExp(`${this.dir}[\\/]?`, 'g')

  constructor(app: Express, dir?: string) {
    this.app = app
    if (dir) this.dir = dir
  }

  use(...args: any[]): Express {
    this.app.use(...args)
    return this.app
  }

  listen(...args: any[]): Express {
    console.log('LOADING! webity')
    this.app.listen(...args)
    return this.app
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
    this.app[method]('/' + path.replace(this.regex, ''), (req: Request, res: Response) => {
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

  route(path: string, method: Method, locals: Record<string, any>): Router {
    const routes = this.listRoutes(this.dir + path)
    for (const route of routes) {
      this.respond(route, method, locals)
    }
    try {
      fs.readFileSync(this.dir + path + '/index.html')
      this.respond(path, method, locals)
    } catch (e) {
      console.log(e)
      console.log(`ERROR! \x1b[41m${path}\x1b[0m does not contain a \x1b[4mindex.html file\x1b[0m`)
    }
    return this
  }

  routeWithMap(path: string, method: Method, routeMap: Record<string, RouteData>): Router {
    const routes = this.listRoutes(this.dir + path)
    for (const route of routes) {
      const relativeRoute = route.replace(this.regex, '')
      const localsFetcher = routeMap[relativeRoute]
      console.log(localsFetcher)
      if (typeof(localsFetcher) === 'function') {
        this.app[method]('/' + route.replace(this.regex, ''), (req: Request, res: Response) => {
          res.send(render(route, '', localsFetcher(req, res), true).html)
        })
      } else {
        this.respond(route, method, localsFetcher)
      }
    }
    return this
  }
}