export type CopyFnParams = {
  text: string
  limit?: number
}
type CopyFn = (params: CopyFnParams) => Promise<boolean> // Return success

export const charLimit = (text: string | undefined, chars?: number): string | undefined => {
  if (!text) return
  return text.substring(0, chars ?? 35)
}
export const copyFn: CopyFn = async ({ text }) => {
  if (!navigator?.clipboard) {
    return false
  }
  if (!text) return false

  return await navigator.clipboard
    .writeText(text)
    .then(() => {
      return true
    })
    .catch(() => {
      return false
    })
}
