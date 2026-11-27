// A bounded mutation-testing pilot for the pure interval predicates.
// This is NOT a Stryker campaign or a codebase-wide mutation score.
// Load the real events and attendance modules in isolated VMs, with only the
// explicitly permitted model dependency. Never rewrite tracked source files.
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const sources = {
  events: readFileSync(new URL('../src/model/events.ts', import.meta.url), 'utf8'),
  attend: readFileSync(new URL('../src/model/attend.ts', import.meta.url), 'utf8'),
}

function compileModule(text, fileName, dependencies = {}) {
  const compiled = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName,
  }).outputText
  const exported = {}
  runInNewContext(compiled, {
    exports: exported,
    require(name) {
      if (!Object.hasOwn(dependencies, name)) throw Error('Unexpected model dependency: ' + name)
      return dependencies[name]
    },
  }, { timeout: 3000 })
  return exported
}

function predicatesFrom(model) {
  const attend = compileModule(model.attend, 'attend.ts')
  const events = compileModule(model.events, 'events.ts', { './attend': attend })
  if (typeof events.fitsFully !== 'function' || typeof events.fitsFreeTime !== 'function') {
    throw Error('Model predicates could not be loaded')
  }
  return events
}

function changeOne(module, before, after) {
  const source = sources[module]
  const occurrences = source.split(before).length - 1
  if (occurrences !== 1) throw Error(`Expected one occurrence of "${before}" in ${module}, saw ${occurrences}. Review the pilot after source edits.`)
  return { ...sources, [module]: source.replace(before, after) }
}

const cases = [
  { name: 'inclusive start', eventStart: '14:00', eventEnd: '15:00', freeStart: '14:00', freeEnd: '16:00', expected: true },
  { name: 'inclusive end', eventStart: '14:00', eventEnd: '15:00', freeStart: '13:00', freeEnd: '15:00', expected: true },
  { name: 'zero-length event invalid', eventStart: '14:00', eventEnd: '14:00', freeStart: '13:00', freeEnd: '15:00', expected: false },
  { name: 'different calendar date', eventStart: '14:00', eventEnd: '15:00', freeStart: '13:00', freeEnd: '16:00', eventDate: '2030-11-08', expected: false },
  { name: 'set-time partial overlap rejected', eventStart: '14:00', eventEnd: '15:00', freeStart: '14:20', freeEnd: '14:50', mode: 'set', expected: false },
  { name: 'drop-in exactly twenty minutes fits', eventStart: '14:00', eventEnd: '15:00', freeStart: '14:40', freeEnd: '15:30', mode: 'dropin', expected: true },
  { name: 'drop-in nineteen minutes rejected', eventStart: '14:00', eventEnd: '15:00', freeStart: '14:41', freeEnd: '15:30', mode: 'dropin', expected: false },
  { name: 'short drop-in fully contained fits', eventStart: '14:00', eventEnd: '14:10', freeStart: '13:00', freeEnd: '15:00', mode: 'dropin', expected: true },
  { name: 'strict predicate rejects even a drop-in partial overlap', eventStart: '14:00', eventEnd: '15:00', freeStart: '14:20', freeEnd: '14:50', mode: 'dropin', strict: true, expected: false },
]

function observed(model, spec) {
  const predicate = spec.mode && !spec.strict ? model.fitsFreeTime : model.fitsFully
  return predicate({
    id: 'event', title: 'Workshop', location: 'Library', date: spec.eventDate ?? '2030-11-07',
    start: spec.eventStart, end: spec.eventEnd, ...(spec.mode ? { attend: spec.mode } : {}),
  }, '2030-11-07', spec.freeStart, spec.freeEnd)
}
const original = predicatesFrom(sources)
for (const spec of cases) {
  if (observed(original, spec) !== spec.expected) throw Error(`Original predicate did not meet independent oracle: ${spec.name}`)
}

const mutants = [
  ['incorrect strict lower boundary', 'attend', 'freeStart <= eventStart', 'freeStart < eventStart'],
  ['incorrect strict upper boundary', 'attend', 'eventEnd <= freeEnd', 'eventEnd < freeEnd'],
  ['incorrect zero-duration permission', 'events', 'eventStart < eventEnd', 'eventStart <= eventEnd'],
  ['incorrect date-identity removal', 'events', 'event.date !== freeDate', 'false'],
  ['incorrect exclusive drop-in threshold', 'attend', '>= MIN_DROP_IN_MINUTES', '> MIN_DROP_IN_MINUTES'],
  ['incorrect reduced drop-in threshold', 'attend', 'MIN_DROP_IN_MINUTES = 20', 'MIN_DROP_IN_MINUTES = 19'],
  ['incorrect attendance-mode removal', 'attend', "return attend === 'dropin' &&", 'return true &&'],
  ['incorrect strict predicate uses event mode', 'events', "return fitsWith('set', event", 'return fitsWith(attendOf(event), event'],
]
let killed = 0
for (const [name, module, before, after] of mutants) {
  const mutated = predicatesFrom(changeOne(module, before, after))
  const failing = cases.filter(spec => observed(mutated, spec) !== spec.expected).map(spec => spec.name)
  if (failing.length) {
    killed++
    console.log(`KILLED ${name} by: ${failing.join(', ')}`)
  } else {
    console.error(`SURVIVED ${name}: add an assertion that detects it`)
  }
}
console.log(`Selected mutation pilot: ${killed}/${mutants.length} mutants killed`)
if (killed !== mutants.length) process.exitCode = 1
