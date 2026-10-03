import { Context, Data, Effect, Layer, Schema } from 'effect'

// Adapted from repos/effect/packages/effect/src/{Effect,Context,Schema,Data}.ts
// and packages/effect/test/Effect.test.ts. Runtime imports use installed packages.
export type LabResult = { value: unknown; trace: string[] }
export type Lesson = {
  id: string; title: string; subtitle: string; minutes: number
  concept: string; model: string; task: string; inputLabel: string; initial: string
  code: string; question: string; choices: string[]; answer: number; explanation: string
  takeaway: string; run: (input: string) => Promise<LabResult>
}

const result = (value: unknown, trace: string[] = []): LabResult => ({ value, trace })
const positive = Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0))
const readInteger = (input: string) => Schema.decodeUnknownSync(Schema.FiniteFromString.check(Schema.isInt(), Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(10)))(input)
class EmptyName extends Data.TaggedError('EmptyName')<{}> {}
class Offline extends Data.TaggedError('Offline')<{}> {}
class Coach extends Context.Service<Coach, { greet: (name: string) => string }>()('training/Coach') {}
const Enrollment = Schema.Struct({ name: Schema.String.check(Schema.isNonEmpty()), sessions: positive })

export const lessons: Lesson[] = [
  {
    id: 'describe', title: 'Describe, then run', subtitle: 'The Effect mental model', minutes: 6,
    concept: 'An Effect is a description of work. Creating one does not perform that work. Run it at the edge of your application. Effect<A, E, R> describes the success value A, expected failure E, and required services R.',
    model: 'Description → runtime → value. Run the same description twice and the work happens twice.',
    task: 'Set the number of runs to 2. Predict how many times the counter changes, then run the lab.',
    inputLabel: 'Number of runs · 1–10', initial: '2',
    code: `import { Effect } from "effect"
let counter = 0
const program = Effect.sync(() => ++counter)
// counter is still 0 here.
const runs = 2 // lab input
const values = []
for (let i = 0; i < runs; i++) {
  values.push(await Effect.runPromise(program))
}
console.log(values, counter)`,
    question: 'When does the callback passed to Effect.sync execute?', choices: ['When the Effect is constructed', 'When the runtime runs the Effect', 'Once, and its result is cached'], answer: 1,
    explanation: 'Effect.sync suspends the callback. Each execution runs it again; an Effect is not an already-running Promise.',
    takeaway: 'Keep descriptions reusable. Execute them at an application boundary.',
    async run(input) { const runs = readInteger(input); let count = 0; const program = Effect.sync(() => ++count); const trace = [`After construction: counter = ${count}`]; const values = []; for (let i = 0; i < runs; i++) values.push(await Effect.runPromise(program)); trace.push(`After ${runs} run(s): counter = ${count}`); return result(values, trace) }
  },
  {
    id: 'compose', title: 'Compose a workflow', subtitle: 'gen, yield* and map', minutes: 8,
    concept: 'Effect.gen makes sequential composition read like ordinary code. yield* extracts an Effect’s success value and carries its failures and requirements into the surrounding workflow. Effect.map changes only a success value.',
    model: 'Each yield* is a step. A failure skips the remaining steps unless you recover.',
    task: 'Change the session count to 4. Predict the plan, then trace the two steps.',
    inputLabel: 'Sessions this week · 1–10', initial: '3',
    code: `import { Effect } from "effect"
const sessions = 3 // lab input
const program = Effect.gen(function*() {
  const count = yield* Effect.succeed(sessions)
  const minutes = yield* Effect.succeed(count * 25)
  return { sessions: count, minutes }
}).pipe(Effect.map(plan => ({ ...plan, ready: true })))
console.log(await Effect.runPromise(program))`,
    question: 'What does yield* do inside Effect.gen?', choices: ['Starts a detached background task', 'Converts every failure into a success', 'Composes a step and gives you its success value'], answer: 2,
    explanation: 'yield* composes the Effect into the workflow. It is not JavaScript await and does not silently recover errors.',
    takeaway: 'Use gen for dependent steps; use map for a pure success transformation.',
    async run(input) { const sessions = readInteger(input); const trace: string[] = []; const program = Effect.gen(function*() { const count = yield* Effect.succeed(sessions); trace.push(`Step 1: ${count} sessions`); const minutes = yield* Effect.succeed(count * 25); trace.push(`Step 2: ${minutes} minutes`); return { sessions: count, minutes } }).pipe(Effect.map(plan => ({ ...plan, ready: true }))); return result(await Effect.runPromise(program), trace) }
  },
  {
    id: 'failure', title: 'Make failure explicit', subtitle: 'Typed errors and recovery', minutes: 8,
    concept: 'Expected failures belong in the error channel. Give domain errors a tag, then recover from the tag you understand. Unexpected thrown exceptions are defects; they should not be disguised as ordinary validation failures.',
    model: 'Success A or expected failure E. catchTag handles one named failure and leaves others alone.',
    task: 'Run with a name. Then clear the field and run again to exercise the recovery branch.',
    inputLabel: 'Your name · blank triggers EmptyName', initial: 'Alex',
    code: `import { Data, Effect } from "effect"
class EmptyName extends Data.TaggedError("EmptyName")<{}> {}
const name = "Alex" // lab input
const greet: Effect.Effect<string, EmptyName> = name.trim()
  ? Effect.succeed("Welcome, " + name.trim())
  : Effect.fail(new EmptyName())
const program = greet.pipe(Effect.catchTag("EmptyName", () =>
  Effect.succeed("Add a name to personalize your plan.")
))
console.log(await Effect.runPromise(program))`,
    question: 'Which case should normally use Effect.fail?', choices: ['An expected domain failure', 'Every programming bug', 'A successful value with a warning'], answer: 0,
    explanation: 'A missing name is expected input failure. A coding bug is a defect. Keeping them distinct makes recovery precise.',
    takeaway: 'Model expected failures; recover narrowly rather than hiding defects.',
    async run(input) { const name = input.trim(); const trace = [name ? 'Success branch' : 'EmptyName failure → catchTag recovery']; const greet: Effect.Effect<string, EmptyName> = name ? Effect.succeed(`Welcome, ${name}`) : Effect.fail(new EmptyName()); const program = greet.pipe(Effect.catchTag('EmptyName', () => Effect.succeed('Add a name to personalize your plan.'))); return result(await Effect.runPromise(program), trace) }
  },
  {
    id: 'schema', title: 'Trust after decoding', subtitle: 'Schema at the boundary', minutes: 10,
    concept: 'A TypeScript type does not validate JSON. Schema turns unknown input into a trusted value or a structured SchemaError. A codec can also transform a wire value: FiniteFromString decodes a string into a finite number and encodes it back.',
    model: 'Unknown JSON → decode → trusted plan → encode → wire format.',
    task: 'Change sessions to "4", then try "oops" or add an extra field. Inspect the validation feedback.',
    inputLabel: 'Enrollment JSON · sessions is a string', initial: '{\n  "name": "Alex",\n  "sessions": "3"\n}',
    code: `import { Effect, Schema } from "effect"
const Form = Schema.Struct({
  name: Schema.String.check(Schema.isNonEmpty()),
  sessions: Schema.FiniteFromString.check(
    Schema.isInt(), Schema.isGreaterThan(0)
  )
})
const input = { name: "Alex", sessions: "3" } // lab JSON
const program = Effect.gen(function*() {
  const decoded = yield* Schema.decodeUnknownEffect(Form, {
    errors: "all", onExcessProperty: "error"
  })(input)
  const encoded = yield* Schema.encodeEffect(Form)(decoded)
  return { decoded, encoded }
})
console.log(await Effect.runPromise(program))`,
    question: 'What is the decoded type of sessions here?', choices: ['string', 'number', 'unknown'], answer: 1,
    explanation: 'FiniteFromString transforms the string on decoding. The decoded Type has a number; the Encoded type has a string.',
    takeaway: 'Decode unknown data once at its boundary. Keep wire and domain types distinct.',
    async run(input) { const data: unknown = JSON.parse(input); const Form = Schema.Struct({ name: Schema.String.check(Schema.isNonEmpty()), sessions: Schema.FiniteFromString.check(Schema.isInt(), Schema.isGreaterThan(0)) }); const program = Effect.gen(function*() { const decoded = yield* Schema.decodeUnknownEffect(Form, { errors: 'all', onExcessProperty: 'error' })(data); const encoded = yield* Schema.encodeEffect(Form)(decoded); return { decoded, encoded } }).pipe(Effect.catchTag('SchemaError', error => Effect.succeed({ validationError: error.message }))); return result(await Effect.runPromise(program), ['JSON parsed', 'Decode → encode (or SchemaError feedback)']) }
  },
  {
    id: 'services', title: 'Declare what you need', subtitle: 'Context and Layer', minutes: 10,
    concept: 'A service is a named dependency, not a global singleton. Your workflow describes what it requires. A Layer supplies an implementation so production and test code can use the same workflow with different dependencies.',
    model: 'Workflow requires Coach → Layer provides Coach → runnable workflow.',
    task: 'Change the name. Follow how the workflow gets its greeting from the supplied Coach.',
    inputLabel: 'Name for the coach', initial: 'Alex',
    code: `import { Context, Effect, Layer } from "effect"
class Coach extends Context.Service<Coach, {
  greet: (name: string) => string
}>()("training/Coach") {}
const name = "Alex" // lab input
const program = Effect.gen(function*() {
  const coach = yield* Coach
  return coach.greet(name)
})
const TestCoach = Layer.succeed(Coach, {
  greet: name => "You’ve got this, " + name + "."
})
console.log(await Effect.runPromise(
  program.pipe(Effect.provide(TestCoach))
))`,
    question: 'What does Layer.succeed provide in this example?', choices: ['A global variable that any file can mutate', 'An implementation of the required Coach service', 'An automatic network connection'], answer: 1,
    explanation: 'The Layer satisfies the Coach requirement. You can provide a different implementation without changing the workflow.',
    takeaway: 'Describe dependencies explicitly. Supply implementations at the edge.',
    async run(input) { const program = Effect.gen(function*() { const coach = yield* Coach; return coach.greet(input) }); const TestCoach = Layer.succeed(Coach, { greet: (name: string) => `You’ve got this, ${name}.` }); return result(await Effect.runPromise(program.pipe(Effect.provide(TestCoach))), ['Coach requirement declared', 'TestCoach layer supplied', 'Service used']) }
  },
  {
    id: 'resources', title: 'Always clean up', subtitle: 'Resource lifetimes', minutes: 8,
    concept: 'Acquire, use, and release belong together. acquireUseRelease guarantees release after use succeeds, fails, or is interrupted, once acquisition succeeds. This is the foundation for safe files, connections, and subscriptions.',
    model: 'Acquire → use → release. Expected failure still reaches release.',
    task: 'Run with "ok", then with "fail". The release line should appear in both traces.',
    inputLabel: 'Scenario · ok or fail', initial: 'ok',
    code: `import { Effect } from "effect"
const scenario = "ok" // lab input
const trace: string[] = []
const program = Effect.acquireUseRelease(
  Effect.sync(() => { trace.push("acquire"); return "session" }),
  session => {
    trace.push("use " + session)
    return scenario === "fail"
      ? Effect.fail("Practice failure")
      : Effect.succeed("Session finished")
  },
  () => Effect.sync(() => { trace.push("release") })
)
const exit = await Effect.runPromise(Effect.exit(program))
console.log(exit._tag, trace)`,
    question: 'If use fails after successful acquisition, what happens?', choices: ['Release is skipped', 'Release runs only if you catch the failure', 'Release still runs'], answer: 2,
    explanation: 'The resource combinator manages release independently of successful use. Failed acquisition is different: no resource was acquired to release.',
    takeaway: 'Make lifetimes part of the workflow rather than relying on scattered cleanup.',
    async run(input) { if (!['ok', 'fail'].includes(input.trim())) throw new Error('Use ok or fail.'); const trace: string[] = []; const program = Effect.acquireUseRelease(Effect.sync(() => { trace.push('acquire'); return 'session' }), session => { trace.push(`use ${session}`); return input.trim() === 'fail' ? Effect.fail('Practice failure') : Effect.succeed('Session finished') }, () => Effect.sync(() => { trace.push('release') })); const exit = await Effect.runPromise(Effect.exit(program)); return result({ exit: exit._tag }, trace) }
  },
  {
    id: 'concurrency', title: 'Control parallel work', subtitle: 'Bounded concurrency', minutes: 8,
    concept: 'Effect.forEach can run independent jobs with a concurrency limit. Results preserve input order even when jobs finish out of order. A limit protects resources; unbounded parallelism is a deliberate choice, not a default.',
    model: 'One worker is sequential. Three workers overlap. Completion order and result order can differ.',
    task: 'Run with concurrency 1, then 3. Compare the finish order with the returned array.',
    inputLabel: 'Concurrency · 1–3', initial: '1',
    code: `import { Effect } from "effect"
const concurrency = 1 // lab input
const jobs = ["A", "B", "C"]
const trace: string[] = []
const program = Effect.forEach(jobs, (job, index) =>
  Effect.gen(function*() {
    trace.push("start " + job)
    yield* Effect.sleep((3 - index) * 60)
    trace.push("finish " + job)
    return job
  }), { concurrency }
)
console.log(await Effect.runPromise(program), trace)`,
    question: 'With concurrency 3, what order does the result array use?', choices: ['The original input order', 'The order jobs finish', 'A random order'], answer: 0,
    explanation: 'Concurrent execution can change finish order. forEach still assembles results in the original input order.',
    takeaway: 'Parallelize independent work and choose an explicit resource limit.',
    async run(input) { const concurrency = readInteger(input); if (concurrency > 3) throw new Error('Choose concurrency 1, 2, or 3.'); const trace: string[] = []; const program = Effect.forEach(['A', 'B', 'C'], (job, index) => Effect.gen(function*() { trace.push(`start ${job}`); yield* Effect.sleep((3 - index) * 60); trace.push(`finish ${job}`); return job }), { concurrency }); return result(await Effect.runPromise(program), trace) }
  },
  {
    id: 'capstone', title: 'Ship a small workflow', subtitle: 'Decode, retry, then recover', minutes: 12,
    concept: 'Put the pieces together: validate a plan, run a simulated save, retry a transient failure, and recover only when retries are exhausted. Keep validation outside the retry so malformed input is not repeatedly processed.',
    model: 'Decode once → save attempt → bounded retry → value or tagged recovery.',
    task: 'Set offlineAttempts to 2, then 3. There are two retries after the first attempt. Try invalid sessions too.',
    inputLabel: 'Plan JSON · offlineAttempts: 0–3', initial: '{\n  "name": "Alex",\n  "sessions": 3,\n  "offlineAttempts": 2\n}',
    code: `import { Data, Effect, Schema } from "effect"
class Offline extends Data.TaggedError("Offline")<{}> {}
const Plan = Schema.Struct({
  name: Schema.String.check(Schema.isNonEmpty()),
  sessions: Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0))
})
const Scenario = Schema.Struct({
  name: Schema.String.check(Schema.isNonEmpty()),
  sessions: Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0)),
  offlineAttempts: Schema.Number.check(
    Schema.isInt(), Schema.isGreaterThanOrEqualTo(0),
    Schema.isLessThanOrEqualTo(3)
  )
})
const input = { name: "Alex", sessions: 3, offlineAttempts: 2 }
let attempts = 0
const program = Effect.gen(function*() {
  const scenario = yield* Schema.decodeUnknownEffect(Scenario, {
    errors: "all", onExcessProperty: "error"
  })(input)
  const plan = yield* Schema.decodeUnknownEffect(Plan)(scenario)
  const save = Effect.suspend(() => {
    attempts++
    return attempts <= scenario.offlineAttempts
      ? Effect.fail(new Offline())
      : Effect.succeed({ saved: true, plan, attempts })
  })
  return yield* save.pipe(Effect.retry({ times: 2 }))
}).pipe(
  Effect.catchTag("Offline", () => Effect.succeed({ saved: false, attempts })),
  Effect.catchTag("SchemaError", e => Effect.succeed({ validationError: e.message }))
)
console.log(await Effect.runPromise(program))`,
    question: 'With times: 2, how many save attempts can run in total?', choices: ['Two', 'Three', 'Unlimited until success'], answer: 1,
    explanation: 'The first attempt plus two retries allows three attempts. The retry wraps save, so Schema validation happens only once.',
    takeaway: 'Validate at the boundary, retry transient work, and recover from failures you understand.',
    async run(input) { const data: unknown = JSON.parse(input); const Scenario = Schema.Struct({ name: Schema.String.check(Schema.isNonEmpty()), sessions: positive, offlineAttempts: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0), Schema.isLessThanOrEqualTo(3)) }); let attempts = 0; const trace: string[] = []; const program = Effect.gen(function*() { const scenario = yield* Schema.decodeUnknownEffect(Scenario, { errors: 'all', onExcessProperty: 'error' })(data); const plan = yield* Schema.decodeUnknownEffect(Enrollment)(scenario); trace.push('Plan validated once'); const save = Effect.suspend(() => { attempts++; trace.push(`Save attempt ${attempts}: ${attempts <= scenario.offlineAttempts ? 'Offline' : 'saved'}`); return attempts <= scenario.offlineAttempts ? Effect.fail(new Offline()) : Effect.succeed({ saved: true, plan, attempts }) }); return yield* save.pipe(Effect.retry({ times: 2 })) }).pipe(Effect.catchTag('Offline', () => Effect.succeed({ saved: false, attempts })), Effect.catchTag('SchemaError', error => Effect.succeed({ validationError: error.message }))); return result(await Effect.runPromise(program), trace) }
  }
]

export const trainingStorageKey = 'launcher-effect-training-v1'
export function readProgress(raw: string | null): string[] {
  try { const value: unknown = JSON.parse(raw ?? '[]'); return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && lessons.some(lesson => lesson.id === id)))] : [] } catch { return [] }
}
