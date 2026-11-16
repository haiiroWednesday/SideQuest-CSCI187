import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const production = import.meta.glob<string>(
  ['../src/**/*.{ts,tsx}', '../server/**/*.ts'],
  { query: '?raw', import: 'default', eager: true },
)
const controllers = import.meta.glob<string>(
  '../src/controller/**/*.{ts,tsx}',
  { query: '?raw', import: 'default', eager: true },
)
const forbiddenDirectives = /\/\/\s*@ts-(?:ignore|nocheck)\b/
const commentedOutStatement = /^\s*\/\/\s*(?:const|let|var|import|export|function|class)\s+[\w{*]/

function parse(path: string, content: string) {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, kind)
}

describe('Kandel clean-code and MVC mechanical safeguards', () => {
  it('keeps Controller modules independent from React View components', () => {
    expect(Object.keys(controllers).length).toBeGreaterThan(0)
    const violations: string[] = []
    for (const [path, content] of Object.entries(controllers)) {
      for (const declaration of parse(path, content).statements) {
        if ((!ts.isImportDeclaration(declaration) && !ts.isExportDeclaration(declaration))
          || !declaration.moduleSpecifier || !ts.isStringLiteral(declaration.moduleSpecifier)) continue
        const dependency = declaration.moduleSpecifier.text
        if (/^react(?:-dom)?(?:\/|$)|(^|\/)view\//.test(dependency)) {
          violations.push(`${path}: imports ${dependency}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('does not hide compiler errors or leave debugger statements in production', () => {
    expect(Object.keys(production).length).toBeGreaterThan(30)
    const violations: string[] = []
    for (const [path, content] of Object.entries(production)) {
      if (forbiddenDirectives.test(content)) violations.push(`${path}: suppressed TypeScript diagnostic`)
      const source = parse(path, content)
      function inspect(node: ts.Node) {
        if (ts.isDebuggerStatement(node)) violations.push(`${path}: debugger statement`)
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
          && node.expression.text === 'eval') violations.push(`${path}: dynamic eval`)
        ts.forEachChild(node, inspect)
      }
      inspect(source)
    }
    expect(violations).toEqual([])
  })

  it('does not retain disabled code disguised as comments in production', () => {
    const violations: string[] = []
    for (const [path, content] of Object.entries(production)) {
      for (const [index, line] of content.split('\n').entries()) {
        if (commentedOutStatement.test(line)) violations.push(`${path}:${index + 1}`)
      }
    }
    expect(violations).toEqual([])
  })
})
