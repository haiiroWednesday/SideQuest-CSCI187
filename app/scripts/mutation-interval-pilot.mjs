// A bounded mutation-testing pilot for the pure interval predicate.
// This is NOT a Stryker campaign or a codebase-wide mutation score.
// It compiles the original and four deliberately altered functions in
// an isolated Node VM. No tracked source file is rewritten.
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/model/events.ts', import.meta.url), 'utf8')
function predicateFrom(text) {
  const compiled = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'events.ts',
  }).outputText
  const exported = {}
  runInNewContext(compiled, { exports: exported }, { timeout: 3000 })
  if (typeof exported.fitsFully !== 'function') throw Error('Model predicate could not be loaded')
  return exported.fitsFully
}
function changeOne(before, after) {
  const occurrences = source.split(before).length - 1
  if (occurrences !== 1)
    throw Error(
      `Expected one occurrence of "${before}", saw ${occurrences}. Review the pilot after source edits.`,
    )
  return source.replace(before, after)
}
const cases = [
  {
    name: 'inclusive start',
    eventStart: '14:00',
    eventEnd: '15:00',
    freeStart: '14:00',
    freeEnd: '16:00',
    eventDate: '2030-11-07',
    expected: true,
  },
  {
    name: 'inclusive end',
    eventStart: '14:00',
    eventEnd: '15:00',
    freeStart: '13:00',
    freeEnd: '15:00',
    eventDate: '2030-11-07',
    expected: true,
  },
  {
    name: 'zero-length event invalid',
    eventStart: '14:00',
    eventEnd: '14:00',
    freeStart: '13:00',
    freeEnd: '15:00',
    eventDate: '2030-11-07',
    expected: false,
  },
  {
    name: 'different calendar date',
    eventStart: '14:00',
    eventEnd: '15:00',
    freeStart: '13:00',
    freeEnd: '16:00',
    eventDate: '2030-11-08',
    expected: false,
  },
]
function observed(fn, spec) {
  return fn(
    {
      id: 'event',
      title: 'Workshop',
      location: 'Library',
      date: spec.eventDate,
      start: spec.eventStart,
      end: spec.eventEnd,
    },
    '2030-11-07',
    spec.freeStart,
    spec.freeEnd,
  )
}
const original = predicateFrom(source)
for (const spec of cases) {
  if (observed(original, spec) !== spec.expected)
    throw Error(`Original predicate did not meet independent oracle: ${spec.name}`)
}
const mutants = [
  ['incorrect strict lower boundary', 'start <= eventStart', 'start < eventStart'],
  ['incorrect strict upper boundary', 'eventEnd <= end', 'eventEnd < end'],
  ['incorrect zero-duration permission', 'eventStart < eventEnd', 'eventStart <= eventEnd'],
  ['incorrect date-identity removal', 'event.date !== freeDate', 'false'],
]
let killed = 0
for (const [name, before, after] of mutants) {
  const mutated = predicateFrom(changeOne(before, after))
  const failing = cases
    .filter(spec => observed(mutated, spec) !== spec.expected)
    .map(spec => spec.name)
  if (failing.length) {
    killed++
    console.log(`KILLED ${name} by: ${failing.join(', ')}`)
  } else {
    console.error(`SURVIVED ${name}: add an assertion that detects it`)
  }
}
console.log(`Selected mutation pilot: ${killed}/${mutants.length} mutants killed`)
if (killed !== mutants.length) process.exitCode = 1
