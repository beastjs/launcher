import { emitKeypressEvents, type Key } from 'node:readline'

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[39m`,
  green: (s: string) => `\x1b[32m${s}\x1b[39m`,
  red: (s: string) => `\x1b[31m${s}\x1b[39m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[39m`
}
export { c as colors }

export class CancelError extends Error {}

type Render = () => string[]
type Handler<T> = (input: string | undefined, key: Key, done: (value: T) => void) => void

// Minimal keypress-driven prompt runner: redraws its own block of lines on every key.
function run<T>(render: Render, onKey: Handler<T>, summary: (value: T) => string): Promise<T> {
  const { stdin, stdout } = process
  if (!stdin.isTTY) throw new Error('gen requires an interactive terminal (TTY).')

  return new Promise<T>((resolve, reject) => {
    let lines = 0
    const draw = (out: string[]) => {
      if (lines) stdout.write(`\x1b[${lines}A\r\x1b[0J`)
      stdout.write(out.join('\n') + '\n')
      lines = out.length
    }
    const cleanup = () => {
      stdin.off('keypress', listener)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\x1b[?25h')
    }
    const listener = (input: string | undefined, key: Key) => {
      if (key?.ctrl && key.name === 'c') {
        cleanup()
        draw([c.red('✖ cancelled')])
        reject(new CancelError())
        return
      }
      let finished = false
      onKey(input, key ?? {}, (value) => {
        finished = true
        cleanup()
        draw([summary(value)])
        resolve(value)
      })
      if (!finished) draw(render())
    }

    emitKeypressEvents(stdin)
    stdin.setRawMode(true)
    stdin.resume()
    stdout.write('\x1b[?25l')
    stdin.on('keypress', listener)
    draw(render())
  })
}

const isPrintable = (input: string | undefined, key: Key) =>
  !!input && !key.ctrl && !key.meta && input.length === 1 && input >= ' ' && input !== '\x7f'

export type TextOptions = {
  message: string
  initial?: string
  placeholder?: string
  validate?: (value: string) => string | undefined
}

export function text({ message, initial = '', placeholder, validate }: TextOptions): Promise<string> {
  let value = ''
  let error: string | undefined
  const fallback = initial || ''

  return run<string>(
    () => {
      const shown = value ? value : c.dim(placeholder ?? fallback)
      const out = [`${c.cyan('?')} ${c.bold(message)} ${shown}${c.cyan('▏')}`]
      if (error) out.push(`  ${c.red(error)}`)
      return out
    },
    (input, key, done) => {
      if (key.name === 'return' || key.name === 'enter') {
        const result = (value || fallback).trim()
        error = validate?.(result)
        if (!error) done(result)
        return
      }
      if (key.name === 'tab' && !value) value = fallback
      else if (key.name === 'backspace') value = value.slice(0, -1)
      else if (isPrintable(input, key)) value += input
      error = undefined
    },
    (v) => `${c.green('✔')} ${c.bold(message)} ${c.dim(v || '—')}`
  )
}

export type Choice<T> = { label: string; value: T; hint?: string }

export type SelectOptions<T> = {
  message: string
  choices: Choice<T>[]
  initial?: number
  pageSize?: number
  filterable?: boolean
}

export function select<T>({
  message,
  choices,
  initial = 0,
  pageSize = 8,
  filterable = false
}: SelectOptions<T>): Promise<T> {
  let query = ''
  let cursor = initial
  let offset = 0

  const filtered = () =>
    query ? choices.filter((ch) => ch.label.toLowerCase().includes(query.toLowerCase())) : choices

  return run<T>(
    () => {
      const list = filtered()
      cursor = Math.max(0, Math.min(cursor, list.length - 1))
      if (cursor < offset) offset = cursor
      if (cursor >= offset + pageSize) offset = cursor - pageSize + 1
      offset = Math.max(0, Math.min(offset, Math.max(0, list.length - pageSize)))

      const help = filterable ? (query ? `filter: ${query}` : 'type to filter') : '↩'
      const out = [`${c.cyan('?')} ${c.bold(message)} ${c.dim(help)}`]
      if (!list.length) out.push(c.dim('  no matches'))
      list.slice(offset, offset + pageSize).forEach((ch, i) => {
        const active = offset + i === cursor
        const hint = ch.hint ? ` ${c.dim(ch.hint)}` : ''
        out.push(active ? `${c.cyan('❯')} ${c.cyan(ch.label)}${hint}` : `  ${ch.label}${hint}`)
      })
      if (list.length > pageSize) out.push(c.dim(`  ${cursor + 1}/${list.length}`))
      return out
    },
    (input, key, done) => {
      const list = filtered()
      if (key.name === 'return' || key.name === 'enter') {
        if (list[cursor]) done(list[cursor].value)
      } else if (key.name === 'up' || (key.ctrl && key.name === 'p')) cursor = cursor > 0 ? cursor - 1 : list.length - 1
      else if (key.name === 'down' || (key.ctrl && key.name === 'n')) cursor = cursor < list.length - 1 ? cursor + 1 : 0
      else if (filterable && key.name === 'backspace') query = query.slice(0, -1)
      else if (filterable && isPrintable(input, key)) {
        query += input
        cursor = 0
      }
    },
    (v) => `${c.green('✔')} ${c.bold(message)} ${c.dim(choices.find((ch) => ch.value === v)?.label ?? String(v))}`
  )
}

export function confirm({ message, initial = true }: { message: string; initial?: boolean }): Promise<boolean> {
  let value = initial
  return run<boolean>(
    () => [
      `${c.cyan('?')} ${c.bold(message)} ${value ? c.cyan(c.bold('Yes')) + ' / No' : 'Yes / ' + c.cyan(c.bold('No'))}`
    ],
    (input, key, done) => {
      if (key.name === 'return' || key.name === 'enter') done(value)
      else if (['left', 'right', 'tab'].includes(key.name ?? '')) value = !value
      else if (input === 'y' || input === 'Y') done(true)
      else if (input === 'n' || input === 'N') done(false)
    },
    (v) => `${c.green('✔')} ${c.bold(message)} ${c.dim(v ? 'Yes' : 'No')}`
  )
}
