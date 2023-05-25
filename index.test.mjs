import { render, Router } from './dist/esm/index.mjs'
import express from 'express'

const app = express()
const router = new Router(app)

router.use(express.static('public'))

const errorHandler = (name, req, res) => res.status(404).send('Error 404')

router.routeWithMap('', 'get', {
  '': { message: 'Home', todo: ['First', 'Second'] },
  'about': { message: 'About', todo: ['X', 'Y'] }
}, errorHandler),

router.listen(3000)