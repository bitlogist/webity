import * as fs from 'fs'

try {
  fs.unlinkSync('dist/esm/index.mjs')
  fs.unlinkSync('dist/esm/index.cjs')
} catch (e) {
  console.log(e)
  fs.renameSync('dist/cjs/index.js', 'dist/cjs/index.cjs')
  fs.renameSync('dist/esm/index.js', 'dist/esm/index.mjs')
}