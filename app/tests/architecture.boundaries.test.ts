// Course architecture regression: production Views use Controllers to reach
// Model/persistence; Model files never depend on React, Views or Controllers.
import appSource from '../src/App.tsx?raw'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const views = { ...import.meta.glob<string>('../src/view/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }), '../src/App.tsx': appSource }
const models = import.meta.glob<string>('../src/model/**/*.ts', { query: '?raw', import: 'default', eager: true })
const parse = (path: string, content: string) => ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const imports = (source: ts.SourceFile) => source.statements.flatMap(node => (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? [node.moduleSpecifier.text] : [])

describe('professor feedback: MVC boundaries', () => {
  it('production View files do not import Model modules or access browser persistence', () => {
    expect(Object.keys(views).length).toBeGreaterThan(1)
    const violations: string[] = []
    for (const [path, content] of Object.entries(views)) {
      const source = parse(path, content)
      for (const dependency of imports(source)) if (/(^|\/)model\//.test(dependency)) violations.push(`${path}: direct Model import ${dependency}`)
      function visit(node: ts.Node) {
        if (ts.isPropertyAccessExpression(node) && ['localStorage', 'sessionStorage', 'indexedDB'].includes(node.name.text)) violations.push(`${path}: direct persistence ${node.getText(source)}`)
        if (ts.isIdentifier(node) && ['localStorage', 'sessionStorage', 'indexedDB'].includes(node.text) && !ts.isPropertyAccessExpression(node.parent)) violations.push(`${path}: direct persistence ${node.text}`)
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
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
