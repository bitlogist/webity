import * as fs from 'fs'
import { Express, Request, Response } from 'express'
import { version } from 'os'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

function typeOf(data: any): string {
  return Object.prototype.toString.call(data).slice(8, -1)
}

function isObject(data: any): boolean {
  return typeOf(data) === 'Object' && Object.getPrototypeOf(data).constructor === Object && Object.getPrototypeOf(data) === Object.prototype
}

function execute(code: string, locals: Record<string, any>, dir: string) {
  try {
    const preset = {
      process: {
        version: process.version,
      },
      eval: null,
      Function: null,
      include: (file: string) => render(dir, file, locals),
      element: (tag: string, text: string, attributes: Record<string, string>) => `<${tag} ${Object.entries(attributes).join(' ').replace(',', '="') + '"'}>${text}</${tag}>`,
      loop: (items: string[], callback: (item: string, i: number) => any) => {
          let x: any = []
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            x.push(callback(item, i))
          }
          return x.join('')
        }
    }
    const f = new Function(...Object.keys(preset), ...Object.keys(locals), `return ${code.match(/(?<=#{)(.|\n)+?(?=}#)/g)}`)
    return f(...Object.values(preset), ...Object.values(locals))
  } catch (e) {
    console.log(e)
    return ''
  }
}

export function render(dir: string = 'views', file: string, locals: Record<string, any>, debug?: boolean): string {
  const root = '$'
  if (file.startsWith(root)) {
    dir = dir.split('/')[0]
    file = file.replace(root, '')
  }
  if (!file) file = 'index.html'
  if (!file.endsWith('.html')) file += '.html'
  if (debug) console.log(dir, file)
  let html = fs.readFileSync(`${dir}/${file}`, 'utf-8')
  const matches = Array.from(html.matchAll(/#{(.|\n)+?}#/g))
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const rendered = execute(match[0], locals, dir)
    html = html.replace(match[0], rendered)
    if (debug) console.log(`SUCCESS! \x1b[32m${match[0]}\x1b[0m -> ${rendered}`)
  }
  return html
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
        routes.push(...this.listRoutes(folder))
      }
    }
    return [path, ...routes]
  }

  respond(path: string, method: Method, locals: Record<string, any>): Express {
    this.app[method](path, (req: Request, res: Response) => {
      const { params, query } = req
      let info: Record<string, any> = {
        params,
        query,
      }
      info = Object.fromEntries([...Object.entries(info), ...Object.entries(locals)]) // append locals or overwrite info
      res.send(render(`${this.dir + path}`, '', info))
    })
    return this.app
  }

  route(path: string, method: Method, locals: Record<string, any>): string[] {
    const routes = this.listRoutes(this.dir + path)
    for (const route of routes) {
      this.respond([path, route].join('/'), method, locals)
      this.app[method](`${path}/${route}`, (req: Request, res: Response) => {
        const { params, query } = req
        let info: Record<string, any> = {
          params,
          query,
        }
        info = Object.fromEntries([...Object.entries(info), ...Object.entries(locals)]) // append locals or overwrite info
        res.send(render(`${this.dir + path}/${route}`, '', info))
      })
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