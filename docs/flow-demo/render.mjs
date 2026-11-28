// Draws chart.mmd and puts the SVG between <!--CHART--> markers in site/index.html.
import { chromium } from '/home/claude/sq-master/app/node_modules/@playwright/test/index.mjs'
import fs from 'fs'
const code = fs.readFileSync('/home/claude/flow/chart.mmd', 'utf8')
const b = await chromium.launch(); const p = await b.newPage()
await p.setContent('<html><body></body></html>')
await p.addScriptTag({ path: '/home/claude/flow/mm/node_modules/mermaid/dist/mermaid.min.js' })
const svg = await p.evaluate(async c => {
  mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#fffaf2', primaryBorderColor: '#751728', primaryTextColor: '#302421', lineColor: '#b08a3e', fontFamily: 'Urbanist, Helvetica, sans-serif', fontSize: '15px' }, flowchart: { htmlLabels: false } })
  return (await mermaid.render('overview', c)).svg
}, code)
await b.close()
const f = '/home/claude/flow/site/index.html', html = fs.readFileSync(f, 'utf8')
fs.writeFileSync(f, html.replace(/<!--CHART-->[\s\S]*?<!--\/CHART-->/, '<!--CHART-->' + svg + '<!--/CHART-->')); console.log('chart', svg.length)
