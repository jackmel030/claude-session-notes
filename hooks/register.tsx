import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Draft, Note } from '../types'

const PANE = 'session-notes'
const TITLE = '記事'
const UNTITLED = '（無標題）'
const TOGGLE_ACTION = 'app:cycleDiffBase'
const EMPTY: Draft = { title: '', body: '' }

const items = atom({ plugin: 'session-notes', key: 'items' } as const, [])
const editingId = atom({ plugin: 'session-notes', key: 'editingId' } as const, null)
const collapsedIds = atom({ plugin: 'session-notes', key: 'collapsedIds' } as const, [])
const draft = atom({ plugin: 'session-notes', key: 'draft' } as const, EMPTY)
const editDraft = atom({ plugin: 'session-notes', key: 'editDraft' } as const, EMPTY)
const isPaneClosed = atom({ plugin: 'session-notes', key: 'isPaneClosed' } as const, false)

const tidy = (input: Draft): Draft | null => {
  const title = input.title.trim()
  const body = input.body.trim()
  if (title === '' && body === '') {
    return null
  }

  return { title: title === '' ? UNTITLED : title, body }
}

const collapsePane = async ($: EngineInterface) => {
  await update($, isPaneClosed, () => true)
  await $.ui.close({ id: PANE })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'notes',
      description: '展開或收合本 session 的記事便籤',
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

      return { text: '記事便籤已收合。' }
    }
    await update($, isPaneClosed, () => false)
    const opened = await $.ui.open({ id: PANE, title: TITLE, focus: true, columns: 40 })

    return {
      text: opened.isPlaced
        ? '記事便籤已展開。'
        : `記事便籤已開啟，但目前放不下：${opened.reason}`,
    }
  })

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
          label={`▸ 記事 ${count} 則`}
          plain
          action={TOGGLE_ACTION}
          onPress={async () => {
            await update($, isPaneClosed, () => false)
            await $.ui.open({ id: PANE, title: TITLE, focus: true, columns: 40 })
          }}
        />
        <Text dimColor> 按一下展開</Text>
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
          {list.length === 0 && <Text dimColor>尚無記事。</Text>}
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

    const add = (input: Draft) => {
      const note = tidy(input)
      if (note === null) {
        return
      }
      void update($, items, all => {
        const id = all.reduce((max, one) => Math.max(max, one.id), 0) + 1

        return [...all, { id, ...note }]
      })
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
            label="◂ 收合"
            plain
            action={TOGGLE_ACTION}
            onPress={() => collapsePane($)}
          />
        </Box>
        <Box flexDirection="column" borderStyle="single" paddingX={1}>
          <Text bold>新增記事</Text>
          <Input
            key="new-title"
            label="標題 "
            placeholder="選填"
            value={newDraft.title}
            submitLabel="新增"
            autoFocus
            onInput={(title: string) => update($, draft, d => ({ ...d, title }))}
            onSubmit={(title: string) => add({ ...newDraft, title })}
          />
          <Input
            key="new-body"
            label="內容 "
            placeholder="輸入後按 Enter 新增"
            value={newDraft.body}
            submitLabel="新增"
            onInput={(body: string) => update($, draft, d => ({ ...d, body }))}
            onSubmit={(body: string) => add({ ...newDraft, body })}
          />
        </Box>

        {list.length === 0 ? (
          <Text dimColor>尚無記事。</Text>
        ) : (
          <Box>
            <Text dimColor>共 {list.length} 則 </Text>
            <Button
              key="expand-all"
              label="全部展開"
              onPress={() => update($, collapsedIds, () => [])}
            />
            <Button
              key="collapse-all"
              label="全部收合"
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
                  <Text bold>編輯第 {index + 1} 則</Text>
                  <Input
                    key={`edit-title-${note.id}`}
                    label="標題 "
                    value={changes.title}
                    submitLabel="儲存"
                    onInput={(title: string) => update($, editDraft, d => ({ ...d, title }))}
                    onSubmit={(title: string) => save(note.id, { ...changes, title })}
                  />
                  <Input
                    key={`edit-body-${note.id}`}
                    label="內容 "
                    value={changes.body}
                    submitLabel="儲存"
                    onInput={(body: string) => update($, editDraft, d => ({ ...d, body }))}
                    onSubmit={(body: string) => save(note.id, { ...changes, body })}
                  />
                </Box>
                <Box>
                  <Button
                    key={`save-${note.id}`}
                    label="儲存"
                    onPress={() => save(note.id, changes)}
                  />
                  <Button
                    key={`cancel-${note.id}`}
                    label="取消"
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
