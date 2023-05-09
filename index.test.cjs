const { render, Router } = require('./dist/cjs/index.cjs')
const express = require('express')

const app = express()
const router = new Router(app)

router.use(express.static('public'))

router.route('', 'get', { message: 'Hello!', todo: ['First', 'Second'] })

router.listen(3000)