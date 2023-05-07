const { render } = require('./dist/cjs/index.cjs')
const express = require('express')
const app = express()

app.use(express.static('public'))

app.get('/', async (req, res) => {
  res.send(render('views', '', { message: 'Hello!', todo: ['Eat', 'Code'] })) // views/index.html is rendered
})

app.listen(3000)