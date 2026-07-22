const assert = require('node:assert/strict')
const http = require('node:http')
const express = require('express')
const puppeteer = require('puppeteer')
const path = require('node:path')

async function main () {
  const app = express()
  app.use(express.static(path.resolve(__dirname, '../public')))
  const server = http.createServer(app)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))

  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-angle=swiftshader']
    })
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__hhViewerBridge?.ready === true)
    const bridge = await page.evaluate(() => ({
      version: window.__hhViewerBridge.version,
      hasViewer: Boolean(window.__hhViewerBridge.viewer),
      hasCamera: Boolean(window.__hhViewerBridge.camera),
      hasControls: Boolean(window.__hhViewerBridge.controls),
      hasSocket: Boolean(window.__hhViewerBridge.socket)
    }))
    assert.deepEqual(bridge, {
      version: 1,
      hasViewer: true,
      hasCamera: true,
      hasControls: true,
      hasSocket: true
    })
  } finally {
    if (browser) await browser.close()
    await new Promise(resolve => server.close(resolve))
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
