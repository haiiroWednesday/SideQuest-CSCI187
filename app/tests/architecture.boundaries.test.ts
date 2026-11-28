// Course architecture regression: production Views use Controllers to reach
// Model/persistence; Model files never depend on React, Views or Controllers.
import appSource from '../src/App.tsx?raw'
import playwrightConfig from '../playwright.config.ts?raw'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const views = {
  ...import.meta.glob<string>('../src/view/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  ...import.meta.glob<string>('../src/presentation/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  '../src/App.tsx': appSource,
}
const models = import.meta.glob<string>('../src/model/**/*.ts', { query: '?raw', import: 'default', eager: true })
const parse = (path: string, content: string) => ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const PERSISTENCE = ['localStorage', 'sessionStorage', 'indexedDB']
// Views draw and pass taps back. Talking to the network is a controller's job.
const NETWORK = ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest', 'sendBeacon']

/** Every direct use of browser storage or the network in one file: `localStorage.getItem`,
 *  `window.localStorage`, a bare `localStorage`, `fetch(...)`, `new WebSocket(...)` and so on. */
export function boundaryViolations(path: string, content: string): string[] {
  const source = parse(path, content)
  const out: string[] = []
  // presentation/ formats Model values for controllers, so it may import Model helpers; never storage or network.
  if (!path.includes('/presentation/')) for (const dependency of imports(source)) if (/(^|\/)model\//.test(dependency)) out.push(`${path}: direct Model import ${dependency}`)
  function visit(node: ts.Node) {
    if (ts.isIdentifier(node) && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node && !PERSISTENCE.includes(node.text) && !NETWORK.includes(node.text))) {
      // Type positions (a `WebSocket` type annotation, `typeof fetch`) are not uses.
      const inType = (n: ts.Node): boolean => !!n.parent && (ts.isTypeNode(n.parent) || ts.isTypeReferenceNode(n.parent) || ts.isTypeQueryNode(n.parent) || (!ts.isExpression(n.parent) && !ts.isPropertyAccessExpression(n.parent) && ts.isTypeElement(n.parent)) || (ts.isQualifiedName(n.parent) && inType(n.parent)))
      const declared = ts.isImportSpecifier(node.parent) || (ts.isPropertyAssignment(node.parent) && node.parent.name === node) || (ts.isPropertySignature(node.parent) && node.parent.name === node)
      if (!inType(node) && !declared) {
        if (PERSISTENCE.includes(node.text)) out.push(`${path}: direct persistence ${node.parent.getText(source)}`)
        if (NETWORK.includes(node.text)) out.push(`${path}: direct network ${node.parent.getText(source)}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return out
}

const imports = (source: ts.SourceFile) => source.statements.flatMap(node => (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? [node.moduleSpecifier.text] : [])

describe('MVC boundaries: Views, Controllers and Models', () => {
  it('browser tests cannot reuse a developer server connected to live Supabase', () => {
    expect(playwrightConfig.match(/reuseExistingServer:\s*false/g)).toHaveLength(4)
    expect(playwrightConfig).not.toMatch(/reuseExistingServer:\s*(?:true|!process\.env\.CI)/)
  })
  it('the boundary check sees every way a view could reach storage or the network', () => {
    const caught = (code: string) => boundaryViolations('x.tsx', code).length
    expect(caught("localStorage.getItem('k')")).toBe(1)
    expect(caught("localStorage.setItem('k', 'v')")).toBe(1)
    expect(caught("window.localStorage.getItem('k')")).toBe(1)
    expect(caught("globalThis.sessionStorage")).toBe(1)
    expect(caught("const s = localStorage")).toBe(1)
    expect(caught("typeof localStorage === 'undefined'")).toBe(1)
    expect(caught("void fetch('/api/x')")).toBe(1)
    expect(caught("window.fetch('/api/x')")).toBe(1)
    expect(caught("new WebSocket('ws://x')")).toBe(1)
    expect(caught("new EventSource('/x')")).toBe(1)
    expect(caught("navigator.sendBeacon('/x')")).toBe(1)
    expect(caught("import { x } from '../model/events'")).toBe(1)
    // Words in comments, strings, types and imported names are not uses.
    expect(caught("// never localStorage\nconst a = 'fetch'\nlet s: WebSocket | null = null\nlet f: typeof fetch\nimport { fetchAll } from '../controller/x'")).toBe(0)
  })

  it('production View and presentation files do not import Model modules or reach storage or the network', () => {
    expect(Object.keys(views).length).toBeGreaterThan(1)
    expect(Object.keys(views).some(p => p.includes('/presentation/'))).toBe(true)
    const violations = Object.entries(views).flatMap(([path, content]) => boundaryViolations(path, content))
    expect(violations).toEqual([])
  })
  it('Model modules have no React, View or Controller imports', () => {
    expect(Object.keys(models).length).toBeGreaterThan(0)
    const violations: string[] = []
    for (const [path, content] of Object.entries(models)) {
      for (const dependency of imports(parse(path, content))) if (/^react(?:-dom)?(?:\/|$)|(^|\/)(?:view|controller)\//.test(dependency)) violations.push(`${path}: ${dependency}`)
    }
    expect(violations).toEqual([])
  })
})
