import { render, Router } from './dist/esm/index.mjs'
import express from 'express'

const app = express()
const router = new Router(app)

router.use(express.static('public'))

router.routeWithMap('', 'get', {
  '': { message: 'Home', todo: ['First', 'Second'] },
  'about': { message: 'Home', todo: ['X', 'Y'] }
})

router.listen(3000)