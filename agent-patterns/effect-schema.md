# Effect Schema patterns for launcher

Use this reference for training and implementation. Import from `effect` or its
published subpaths. `repos/effect/` is read-only reference material; never import
its source into application code.

## Version and source of truth

Reviewed against the vendored Effect **4.0.0** snapshot
`86181a0867f3967978d7454d2e08c2b80c56dc4c`; the installed package also reports
4.0.0. Recheck these sources when updating the dependency:

- [Schema implementation and API examples](../repos/effect/packages/effect/src/Schema.ts)
- [Schema tests](../repos/effect/packages/effect/test/schema/Schema.test.ts)
- [Transformation tests](../repos/effect/packages/effect/test/schema/SchemaTransformation.test.ts)
- [v3 to v4 Schema migration](../repos/effect/migration/schema.md)

The examples below are adapted from these local sources and verified against the
installed dependency. Library JSDoc is useful, but implementation and executable
tests settle ambiguities.

## Constructors, combinators, and types

Use `Struct` for records, `Array` for collections, `Literal` for one literal,
`Literals([...])` for an enumeration, `Union([...])` for alternatives, and
`NullOr` when null is intentional. Refine with `.check(...)`. Decode untrusted
input rather than using a TypeScript assertion.

```ts
import { Schema } from "effect"

const Exercise = Schema.Struct({
  name: Schema.String.check(Schema.isNonEmpty()),
  reps: Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0)),
  kind: Schema.Literals(["strength", "mobility"]),
  note: Schema.optionalKey(Schema.String),
  equipment: Schema.NullOr(Schema.String)
})
const Workout = Schema.Array(Exercise)
type Exercise = typeof Exercise.Type
type Workout = typeof Workout.Type

const workout: Workout = Schema.decodeUnknownSync(Workout)([
  { name: "Squat", reps: 5, kind: "strength", equipment: null }
])
console.log(workout)
```

`optionalKey(S)` permits omission; an explicitly present `undefined` still has
to satisfy `S`. `optional(S)` permits omission and `undefined`. Choose deliberately.
`isNonEmpty()` does not trim whitespace; normalize or add a check when required.
Schemas expose both `Type` (decoded domain value) and `Encoded` (wire format).
Keep service requirements in mind: codecs also track `DecodingServices` and
`EncodingServices`.

## Decode at boundaries and encode for storage

Adapted from the `NumberFromString`/`FiniteFromString` implementation and Schema
adapter tests. A codec can have different input and output types.

```ts
import { Schema } from "effect"

const Form = Schema.Struct({ reps: Schema.FiniteFromString })
type Form = typeof Form.Type       // { readonly reps: number }
type Payload = typeof Form.Encoded // { readonly reps: string }

const decoded: Form = Schema.decodeUnknownSync(Form)({ reps: "12" })
const encoded: Payload = Schema.encodeSync(Form)(decoded)
console.log(decoded.reps, encoded.reps) // 12, "12"
```

Use `decodeUnknownEffect` for untrusted data inside Effect workflows and
`encodeEffect` to serialize typed domain values. Sync adapters are suitable for
small synchronous training examples; they throw on failure and cannot supply
asynchronous services. `decodeUnknownPromise` is available for Promise callers.
Reuse decoders rather than rebuilding schemas per render.

Extra object keys are ignored by default. Use
`{ onExcessProperty: "error" }` when a strict boundary is intended, and
`{ errors: "all" }` when a form should report multiple problems.

## Transformations are bidirectional

Adapted from the `decodeTo` example in `Schema.ts` and
`SchemaTransformation.test.ts`. `decode` maps the source decoded value into the
target encoded value; `encode` maps back. Both directions must be meaningful.

```ts
import { Schema, SchemaGetter } from "effect"

const LengthFromText = Schema.String.pipe(
  Schema.decodeTo(Schema.Finite, {
    decode: SchemaGetter.transform((text) => Number(text)),
    encode: SchemaGetter.transform((value) => String(value))
  })
)
console.log(Schema.decodeUnknownSync(LengthFromText)("2.5")) // 2.5
console.log(Schema.encodeSync(LengthFromText)(2.5)) // "2.5"
```

Prefer built-in codecs such as `FiniteFromString` over custom numeric parsing.
`NumberFromString` can accept non-finite values; it is not a finite-number check.
For transformations that can fail or need services, inspect
`SchemaGetter.transformEffect` and the `decodeTo` implementation before writing
one. Do not hide parsing failures by returning a fabricated default.
Round trips may normalize input (`"02"` can encode as `"2"`); test the intended
canonical format rather than assuming byte-for-byte equality.

## Error handling

`Schema.decodeUnknownEffect` fails with `SchemaError`; its `issue` retains the
structured validation problem, and `message` provides readable feedback. The
lower-level `SchemaParser` adapters expose `SchemaIssue.Issue` directly. Do not
confuse their failure types.

```ts
import { Effect, Schema } from "effect"

const Positive = Schema.Number.check(Schema.isGreaterThan(0))
const validate = Schema.decodeUnknownEffect(Positive, { errors: "all" })
const program = validate(-1).pipe(
  Effect.catchTag("SchemaError", (error) =>
    Effect.succeed({ valid: false as const, message: error.message })
  )
)
console.log(await Effect.runPromise(program))
```

Use tagged recovery for expected validation failures. Preserve unexpected defects
and interruption; do not catch every failure and label it invalid user input.
For synchronous callers, check `Schema.isSchemaError(error)` in a `catch` block.
Use `decodeUnknownExit` or `decodeUnknownResult` when the caller needs an explicit
success/failure value instead of throwing.

## Avoid v3 patterns and accidental bypasses

- Use `Union([A, B])` and `Literals(["a", "b"])`, not v3 variadic forms.
- Use `.check(Schema.isInt())`, not old filter combinator recipes.
- Use `decodeUnknownEffect`, not the old `decodeUnknown` API name.
- Use `decodeTo` with `SchemaGetter` or `SchemaTransformation`, not the old
  `Schema.transform(from, to, ...)` signature.
- Do not use `as DomainType` to accept untrusted input or treat `toType(codec)`
  as a replacement for decoding a wire format; `toType` removes transformations.
- Do not execute an Effect by assuming construction runs it. Run it at an
  application boundary, with the required services supplied.
- Test valid input, invalid input, optional fields, and encoding round trips.
  Keep examples focused so each training exercise teaches one concept.
- Do not copy imports from vendored tests (`@effect/...` helpers or relative
  source paths). Adapt examples to public package imports.
