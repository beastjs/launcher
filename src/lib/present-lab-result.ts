const label = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, letter => letter.toUpperCase())
const typeOf = (value: unknown) => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
const display = (value: unknown): string => {
  if (value === null) return 'None'
  if (value === undefined) return 'No value'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.map(display).join(' · ') || 'Empty collection'
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${label(key)}: ${display(item)}`).join(' · ') || 'Empty record'
  return String(value)
}

export function presentLabResult(value: unknown) {
  const object = value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  const validation = object && typeof object.validationError === 'string' ? object.validationError : null
  const title = validation ? 'Validation needs attention' : object?.saved === false ? 'Save retries exhausted' : object?.exit === 'Failure' ? 'Expected failure observed' : 'Program finished'
  const sections = validation ? [] : Array.isArray(value)
    ? [{ title: 'Returned values', fields: value.map((item, index) => ({ label: `Item ${index + 1}`, value: display(item), type: typeOf(item) })) }]
    : object ? Object.entries(object).map(([key, item]) => ({
      title: label(key),
      fields: item !== null && typeof item === 'object' && !Array.isArray(item)
        ? Object.entries(item).map(([field, data]) => ({ label: label(field), value: display(data), type: typeOf(data) }))
        : [{ label: label(key), value: display(item), type: typeOf(item) }]
    })) : []
  return { title, validation, message: !object && !Array.isArray(value) ? display(value) : null, sections }
}
