import type { WorkspaceHandle } from '@danfessler/trellis'

// Open (or reveal, when already open) a doc view for a source path.
export function openDoc(handle: WorkspaceHandle, path: string) {
  return handle.open('doc', {
    params: { path },
    placement: 'stage',
    reuse: 'params'
  })
}
