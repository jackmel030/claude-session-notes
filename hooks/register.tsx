import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Draft, Note } from '../types'

const PANE = 'session-notes'
const TITLE = 'Notes'
const UNTITLED = '(untitled)'
const TOGGLE_ACTION = 'app:cycleDiffBase'
const EMPTY: Draft = { title: '', body: '' }

const items = atom({ plugin: 'session-notes', key: 'items' } as const, [])
const editingId = atom({ plugin: 'session-notes', key: 'editingId' } as const, null)
const collapsedIds = atom({ plugin: 'session-notes', key: 'collapsedIds' } as const, [])
const draft = atom({ plugin: 'session-notes', key: 'draft' } as const, EMPTY)
const editDraft = atom({ plugin: 'session-notes', key: 'editDraft' } as const, EMPTY)
const isPaneClosed = atom({ plugin: 'session-notes', key: 'isPaneClosed' } as const, false)

const WIDE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/

const cellWidth = (text: string) =>
  [...text].reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0)

const tidy = (input: Draft): Draft | null => {
  const title = input.title.trim()
  const body = input.body.trim()
  if (title === '' && body === '') {
    return null
  }

  return { title: title === '' ? UNTITLED : title, body }
}

const ADD_NOTES = 'add_notes'
const MAX_BATCH = 50

const appendNotes = (
  $: EngineInterface,
  drafts: readonly Draft[],
): Promise<Note[]> => {
  const notes = drafts.map(tidy).filter((one): one is Draft => one !== null)
  let added: Note[] = []

  return update($, items, all => {
    const start = all.reduce((max, one) => Math.max(max, one.id), 0) + 1
    added = notes.map((note, index) => ({ id: start + index, ...note }))

    return [...all, ...added]
  }).then(() => added)
}

const toDrafts = (value: unknown): Draft[] | string => {
  if (!Array.isArray(value) || value.length === 0) {
    return '`notes` must be a non-empty array of { title?, body? }.'
  }
  if (value.length > MAX_BATCH) {
    return `At most ${MAX_BATCH} notes per call.`
  }
  const drafts: Draft[] = []
  for (const one of value) {
    if (typeof one !== 'object' || one === null) {
      return 'Each note must be an object with optional string `title` and `body`.'
    }
    const { title = '', body = '' } = one as { title?: unknown; body?: unknown }
    if (typeof title !== 'string' || typeof body !== 'string') {
      return 'Each note must be an object with optional string `title` and `body`.'
    }
    drafts.push({ title, body })
  }

  return drafts
}

const collapsePane = async ($: EngineInterface) => {
  await update($, isPaneClosed, () => true)
  await $.ui.close({ id: PANE })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'notes',
      description: 'Expand or collapse the session notes panel',
    })
    await $.tool.register({
      name: ADD_NOTES,
      description:
        "Add one or more notes to the user's session notes panel (a sidebar the user reads while working). " +
        'Use when the user asks to save, jot down or add something to their notes. ' +
        `Up to ${MAX_BATCH} notes per call; each note has an optional short title and a body.`,
      inputSchema: {
        type: 'object',
        properties: {
          notes: {
            type: 'array',
            minItems: 1,
            maxItems: MAX_BATCH,
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short heading; optional.' },
                body: { type: 'string', description: 'The note text.' },
              },
            },
          },
        },
        required: ['notes'],
      },
      isDeferred: false,
    })
    if (!(await read($, isPaneClosed))) {
      const opened = await $.ui.open({ id: PANE, title: TITLE, columns: 40 })
      if (!opened.isPlaced) {
        await update($, isPaneClosed, () => true)
      }
    }

    return next(e)
  })

  on('command.run', { command: 'notes' }, async $ => {
    const panes = await $.ui.panes()
    const pane = panes.find(one => one.id === PANE)
    if (pane !== undefined && !(await read($, isPaneClosed))) {
      await collapsePane($)

      return { text: 'Notes panel collapsed.' }
    }
    await update($, isPaneClosed, () => false)
    const opened = await $.ui.open({ id: PANE, title: TITLE, focus: true, columns: 40 })

    return {
      text: opened.isPlaced
        ? 'Notes panel expanded.'
        : `Notes panel opened but cannot be shown yet: ${opened.reason}`,
    }
  })

  on('tool.call', { tool: 'mcp__session-notes__add_notes' }, async ($, e) => {
    const drafts = toDrafts((e as unknown as { notes?: unknown }).notes)
    if (typeof drafts === 'string') {
      return { deny: drafts }
    }
    const added = await appendNotes($, drafts)
    if (added.length === 0) {
      return { deny: 'Every note was empty; nothing was added.' }
    }
    const total = (await read($, items)).length

    return {
      result: `Added ${added.length} note(s) to the session notes panel (now ${total} in total).`,
    }
  }).catch(() => ({ deny: 'The notes could not be added.' }))

  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind !== 'unload') {
      await update($, isPaneClosed, () => true)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isPaneClosed))) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)
    const count = (await read($, items)).length

    return (
      <Box>
        <Button
          key="expand-pane"
          label={`▸ Notes (${count})`}
          plain
          action={TOGGLE_ACTION}
          onPress={async () => {
            await update($, isPaneClosed, () => false)
            await $.ui.open({ id: PANE, title: TITLE, focus: true, columns: 40 })
          }}
        />
        <Text dimColor> click to expand</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, items)
    const collapsed = await read($, collapsedIds)

    if (e.surface === 'mobile') {
      const { Box, Text } = $.ui.resolve(e)

      return (
        <Box flexDirection="column">
          {list.length === 0 && <Text dimColor>No notes yet.</Text>}
          {list.map((note, index) => (
            <Box key={`card-${note.id}`} flexDirection="column" borderStyle="round" paddingX={1}>
              <Text bold>
                {index + 1}. {note.title}
              </Text>
              {note.body !== '' && <Text>{note.body}</Text>}
            </Box>
          ))}
        </Box>
      )
    }

    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const editing = await read($, editingId)
    const newDraft = await read($, draft)
    const changes = await read($, editDraft)
    const fieldColumns = Math.max(8, e.props.bodyColumns - 18)

    const preview = (key: string, text: string) =>
      cellWidth(text) > fieldColumns && (
        <Box key={key}>
          <Text dimColor wrap="wrap">
            {text}
          </Text>
        </Box>
      )

    const add = (input: Draft) => {
      if (tidy(input) === null) {
        return
      }
      void appendNotes($, [input])
      void update($, draft, () => EMPTY)
    }

    const startEdit = (note: Note) => {
      void update($, editDraft, () => ({ title: note.title, body: note.body }))
      void update($, editingId, () => note.id)
    }

    const save = (id: number, input: Draft) => {
      const note = tidy(input)
      void update($, items, all =>
        note === null
          ? all.filter(one => one.id !== id)
          : all.map(one => (one.id === id ? { id, ...note } : one)),
      )
      void update($, editingId, () => null)
    }

    const remove = (id: number) => {
      void update($, items, all => all.filter(one => one.id !== id))
      void update($, collapsedIds, ids => ids.filter(one => one !== id))
      void update($, editingId, current => (current === id ? null : current))
    }

    const toggle = (id: number) =>
      update($, collapsedIds, ids =>
        ids.includes(id) ? ids.filter(one => one !== id) : [...ids, id],
      )

    return (
      <Box flexDirection="column" gap={1}>
        <Box justifyContent="flex-end">
          <Button
            key="collapse-pane"
            label="◂ Collapse"
            plain
            action={TOGGLE_ACTION}
            onPress={() => collapsePane($)}
          />
        </Box>
        <Box flexDirection="column" borderStyle="single" paddingX={1}>
          <Text bold>New note</Text>
          <Input
            key="new-title"
            label="Title "
            placeholder="optional"
            value={newDraft.title}
            submitLabel="add"
            autoFocus
            onInput={(title: string) => update($, draft, d => ({ ...d, title }))}
            onSubmit={(title: string) => add({ ...newDraft, title })}
          />
          {preview('new-title-preview', newDraft.title)}
          <Input
            key="new-body"
            label="Body  "
            placeholder="type, then Enter to add"
            value={newDraft.body}
            submitLabel="add"
            onInput={(body: string) => update($, draft, d => ({ ...d, body }))}
            onSubmit={(body: string) => add({ ...newDraft, body })}
          />
          {preview('new-body-preview', newDraft.body)}
        </Box>

        {list.length === 0 ? (
          <Text dimColor>No notes yet.</Text>
        ) : (
          <Box>
            <Text dimColor>{list.length === 1 ? '1 note' : `${list.length} notes`} </Text>
            <Button
              key="expand-all"
              label="Expand all"
              onPress={() => update($, collapsedIds, () => [])}
            />
            <Button
              key="collapse-all"
              label="Collapse all"
              onPress={() => update($, collapsedIds, () => list.map(one => one.id))}
            />
          </Box>
        )}

        {list.map((note, index) => {
          const isCollapsed = collapsed.includes(note.id)

          if (note.id === editing) {
            return (
              <Box key={`card-${note.id}`} flexDirection="column">
                <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
                  <Text bold>Editing note {index + 1}</Text>
                  <Input
                    key={`edit-title-${note.id}`}
                    label="Title "
                    value={changes.title}
                    submitLabel="save"
                    onInput={(title: string) => update($, editDraft, d => ({ ...d, title }))}
                    onSubmit={(title: string) => save(note.id, { ...changes, title })}
                  />
                  {preview(`edit-title-preview-${note.id}`, changes.title)}
                  <Input
                    key={`edit-body-${note.id}`}
                    label="Body  "
                    value={changes.body}
                    submitLabel="save"
                    onInput={(body: string) => update($, editDraft, d => ({ ...d, body }))}
                    onSubmit={(body: string) => save(note.id, { ...changes, body })}
                  />
                  {preview(`edit-body-preview-${note.id}`, changes.body)}
                </Box>
                <Box>
                  <Button
                    key={`save-${note.id}`}
                    label="Save"
                    onPress={() => save(note.id, changes)}
                  />
                  <Button
                    key={`cancel-${note.id}`}
                    label="Cancel"
                    onPress={() => update($, editingId, () => null)}
                  />
                </Box>
              </Box>
            )
          }

          return (
            <Box key={`card-${note.id}`} flexDirection="column">
              <Box flexDirection="column" borderStyle="round" paddingX={1}>
                <Box columnGap={1}>
                  <Box flexGrow={1}>
                    <Button
                      key={`toggle-${note.id}`}
                      label={`${isCollapsed ? '▸' : '▾'} ${index + 1}. ${note.title}`}
                      plain
                      onPress={() => toggle(note.id)}
                    />
                  </Box>
                  <Button
                    key={`edit-btn-${note.id}`}
                    label="✎"
                    plain
                    onPress={() => startEdit(note)}
                  />
                  <Button
                    key={`del-${note.id}`}
                    label="✕"
                    plain
                    onPress={() => remove(note.id)}
                  />
                </Box>
                {!isCollapsed && note.body !== '' && <Text>{note.body}</Text>}
              </Box>
            </Box>
          )
        })}
      </Box>
    )
  })
}
