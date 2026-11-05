// Guard the conventions shared by posting, browsing, search and Schedule code.
// Keep this focused on mechanical consistency; behavior has separate tests.
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { toSqlTime } from '../src/model/eventCatalog'

const productionSources = import.meta.glob<string>(
  ['../src/**/*.{ts,tsx}', '../server/**/*.ts'],
  { query: '?raw', import: 'default', eager: true },
)

function staticModules(path: string, content: string): string[] {
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true, kind)
  return source.statements.flatMap(statement => {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
      && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      return [statement.moduleSpecifier.text]
    }
    return []
  })
}

describe('shared production conventions', () => {
  it('discovers the live app and API sources', () => {
    expect(Object.keys(productionSources).length).toBeGreaterThan(30)
  })
  it('uses extensionless relative TypeScript imports consistently', () => {
    const violations: string[] = []
    for (const [path, source] of Object.entries(productionSources)) {
      for (const modulePath of staticModules(path, source)) {
        if (modulePath.startsWith('.') && /\.(ts|tsx)$/.test(modulePath)) {
          violations.push(`${path}: ${modulePath}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('keeps implementation comments about behavior rather than contributors or grading', () => {
    const violations: string[] = []
    for (const [path, source] of Object.entries(productionSources)) {
      source.split('\n').forEach((line, index) => {
        if (!/^\s*\/\//.test(line)) return
        if (/\b(?:professor|instructor|grader|owner:|Daven|Devonny|Sembiyan|Cynthia)\b/i.test(line)
          || /[\u{1F300}-\u{1FAFF}]/u.test(line)) {
          violations.push(`${path}:${index + 1}`)
        }
      })
    }
    expect(violations).toEqual([])
  })

  it('normalizes SQL-style time values identically in local and test adapters', () => {
    expect(toSqlTime('09:05')).toBe('09:05:00')
    expect(toSqlTime('17:30')).toBe('17:30:00')
    expect(toSqlTime('17:30:00')).toBe('17:30:00')
  })
})
