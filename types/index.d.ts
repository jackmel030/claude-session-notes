export type Note = { id: number; title: string; body: string }
export type Draft = { title: string; body: string }

declare module 'claude-code' {
  interface PluginState {
    'session-notes': {
      items: Note[]
      editingId: number | null
      collapsedIds: number[]
      draft: Draft
      editDraft: Draft
    }
  }
}
