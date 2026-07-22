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
    const workerErrors = []
    page.on('console', message => {
      if (message.type() === 'error' && message.text().includes('[WorldRenderer] Worker')) workerErrors.push(message.text())
    })
    page.on('pageerror', error => workerErrors.push(error.message))
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

    assert.equal(await page.evaluate(() => window.__hhViewerBridge.viewer.setVersion('1.21.8')), true)
    await page.waitForFunction(() => Boolean(window.__hhViewerBridge.viewer.world.blockStatesData))
    await new Promise(resolve => setTimeout(resolve, 250))
    assert.deepEqual(workerErrors, [])
  } finally {
    if (browser) await browser.close()
    await new Promise(resolve => server.close(resolve))
  }
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
