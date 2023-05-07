import { render, Router } from './dist/esm/index.mjs'
import express from 'express'
const app = express()
const router = new Router(app)

router.use(express.static('public'))

router.route('/', 'get', { message: 'Hello!', todo: ['Eat', 'Code'] })

router.listen(3000)