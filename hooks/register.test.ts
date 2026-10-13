import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

const paneProps = (bodyRows: number) => ({
  title: 'Notes',
  isFocused: true,
  bodyColumns: 40,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows },
  view: {},
})

for (const surface of SURFACES) {
  test(`${surface}: adds, edits and deletes notes with separate title and body`, async $ => {
    const ui = await $.ui.mount({
      plugin: 'session-notes',
      surface,
      component: 'Pane',
      requestId: 'session-notes',
      props: paneProps(20),
    })

    expect(await ui.find({ type: 'Text', text: 'No notes yet.' })).toBeDefined()

    await ui.input({ key: 'new-title', text: 'Groceries', kind: 'change' })
    await ui.input({ key: 'new-body', text: '  Milk, eggs  ' })
    expect(await ui.find({ key: 'toggle-1' })).toMatchObject({ props: { label: '▾ 1. Groceries' } })
    expect(await ui.find({ type: 'Text', text: 'Milk, eggs' })).toBeDefined()
    expect((await ui.find({ key: 'new-title' }))?.props.value).toBe('')
    expect((await ui.find({ key: 'new-body' }))?.props.value).toBe('')

    await ui.input({ key: 'new-body', text: '   ' })
    await ui.input({ key: 'new-body', text: 'Reply to MR' })
    expect(await ui.find({ key: 'toggle-2' })).toMatchObject({ props: { label: '▾ 2. (untitled)' } })
    expect(await ui.find({ key: 'toggle-3' })).toBeUndefined()

    await ui.press({ key: 'edit-btn-1' })
    expect((await ui.find({ key: 'edit-title-1' }))?.props.value).toBe('Groceries')
    expect((await ui.find({ key: 'edit-body-1' }))?.props.value).toBe('Milk, eggs')
    await ui.input({ key: 'edit-title-1', text: 'Supermarket', kind: 'change' })
    await ui.press({ key: 'save-1' })
    expect(await ui.find({ key: 'toggle-1' })).toMatchObject({ props: { label: '▾ 1. Supermarket' } })
    expect(await ui.find({ key: 'edit-title-1' })).toBeUndefined()

    await ui.press({ key: 'edit-btn-2' })
    await ui.input({ key: 'edit-body-2', text: 'changed', kind: 'change' })
    await ui.press({ key: 'cancel-2' })
    expect(await ui.find({ type: 'Text', text: 'Reply to MR' })).toBeDefined()

    await ui.press({ key: 'del-1' })
    expect(await ui.find({ key: 'toggle-1' })).toBeUndefined()
    expect(await ui.find({ key: 'toggle-2' })).toMatchObject({ props: { label: '▾ 1. (untitled)' } })

    await ui.press({ key: 'edit-btn-2' })
    await ui.input({ key: 'edit-title-2', text: '', kind: 'change' })
    await ui.input({ key: 'edit-body-2', text: '' })
    expect(await ui.find({ type: 'Text', text: 'No notes yet.' })).toBeDefined()
  })

  test(`${surface}: collapses and expands one note or all`, async $ => {
    const ui = await $.ui.mount({
      plugin: 'session-notes',
      surface,
      component: 'Pane',
      requestId: 'session-notes',
      props: paneProps(20),
    })
    await ui.input({ key: 'new-title', text: 'Alpha', kind: 'change' })
    await ui.input({ key: 'new-body', text: 'Alpha body' })
    await ui.input({ key: 'new-title', text: 'Beta', kind: 'change' })
    await ui.input({ key: 'new-body', text: 'Beta body' })

    await ui.press({ key: 'toggle-1' })
    expect(await ui.find({ key: 'toggle-1' })).toMatchObject({ props: { label: '▸ 1. Alpha' } })
    expect(await ui.find({ type: 'Text', text: 'Alpha body' })).toBeUndefined()
    expect(await ui.find({ key: 'edit-btn-1' })).toMatchObject({ props: { label: '✎' } })
    expect(await ui.find({ key: 'del-1' })).toMatchObject({ props: { label: '✕' } })
    expect(await ui.find({ type: 'Text', text: 'Beta body' })).toBeDefined()

    await ui.press({ key: 'toggle-1' })
    expect(await ui.find({ type: 'Text', text: 'Alpha body' })).toBeDefined()

    await ui.press({ key: 'collapse-all' })
    expect(await ui.find({ type: 'Text', text: 'Alpha body' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'Beta body' })).toBeUndefined()

    await ui.press({ key: 'expand-all' })
    expect(await ui.find({ type: 'Text', text: 'Alpha body' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Beta body' })).toBeDefined()
  })

  test(`${surface}: keeps every note for the pane to scroll`, async $ => {
    const ui = await $.ui.mount({
      plugin: 'session-notes',
      surface,
      component: 'Pane',
      requestId: 'session-notes',
      props: paneProps(5),
    })
    for (let i = 1; i <= 12; i += 1) {
      await ui.input({ key: 'new-body', text: `Note ${i}` })
    }

    expect(await ui.find({ key: 'toggle-12' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Note 12' })).toBeDefined()
  })
}

const fakeEngine = (on: On, placed: boolean) => {
  const calls: string[] = []
  let isOpen = false
  on('session.start', async (_, e) => ({ cwd: e.cwd }))
  on('command.register', async () => ({ value: { command: 'notes' } }))
  on('ui.open', async (_, e) => {
    calls.push(`open:${e.id}`)
    isOpen = true
    return { value: placed ? { isPlaced: true as const } : { isPlaced: false as const, reason: 'too narrow' } }
  })
  on('ui.close', async (_, e) => {
    calls.push(`close:${e.id}`)
    isOpen = false
    return { value: undefined }
  })
  on('ui.panes', async () => ({
    value: isOpen
      ? [{ id: 'session-notes', title: 'Notes', isShown: placed, isFocused: false, isPlaced: placed }]
      : [],
  }))
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Box } = $.ui.resolve(e)
    return Box({})
  })
  return calls
}

const runNotes = ($: Engine) =>
  $.command.run({
    command: 'notes',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })

const mountBand = ($: Engine) =>
  $.ui.mount({
    plugin: 'session-notes',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 5, bodyColumns: 80, scroll: { offset: 0, bodyRows: 5 }, view: {} },
  })

test('opens the pane when the session starts, without the expand row', async ($, on) => {
  const calls = fakeEngine(on, true)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  expect(calls).toEqual(['open:session-notes'])

  const band = await mountBand($)
  expect(await band.find({ key: 'expand-pane' })).toBeUndefined()
})

test('shows the expand row when the terminal is too narrow', async ($, on) => {
  fakeEngine(on, false)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const band = await mountBand($)
  expect(await band.find({ key: 'expand-pane' })).toBeDefined()
})

test('collapse closes the pane and shows the expand row, which reopens it', async ($, on) => {
  const calls = fakeEngine(on, true)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const pane = await $.ui.mount({
    plugin: 'session-notes',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'session-notes',
    props: paneProps(20),
  })
  await pane.input({ key: 'new-body', text: 'Alpha' })

  await pane.press({ key: 'collapse-pane' })
  expect(calls).toEqual(['open:session-notes', 'close:session-notes'])

  const band = await mountBand($)
  expect(await band.find({ key: 'expand-pane' })).toMatchObject({ props: { label: '▸ Notes (1)' } })

  await band.press({ key: 'expand-pane' })
  expect(calls).toEqual(['open:session-notes', 'close:session-notes', 'open:session-notes'])
  expect(await band.find({ key: 'expand-pane' })).toBeUndefined()
})

test('/notes toggles collapse and expand', async ($, on) => {
  const calls = fakeEngine(on, true)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect((await runNotes($)).text).toBe('Notes panel collapsed.')
  expect((await runNotes($)).text).toBe('Notes panel expanded.')
  expect(calls).toEqual(['open:session-notes', 'close:session-notes', 'open:session-notes'])
})

test('/notes explains a narrow terminal and collapses on the next run', async ($, on) => {
  const calls = fakeEngine(on, false)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect((await runNotes($)).text).toBe('Notes panel opened but cannot be shown yet: too narrow')
  expect((await runNotes($)).text).toBe('Notes panel collapsed.')
  expect(calls).toEqual(['open:session-notes', 'open:session-notes', 'close:session-notes'])
})

for (const surface of SURFACES) {
  test(`${surface}: shows the whole text below a field once it outgrows the field`, async $ => {
    const ui = await $.ui.mount({
      plugin: 'session-notes',
      surface,
      component: 'Pane',
      requestId: 'session-notes',
      props: paneProps(20),
    })
    const long = 'Call the vendor about the delayed shipment and confirm the new date'

    await ui.input({ key: 'new-body', text: 'short', kind: 'change' })
    expect(await ui.find({ key: 'new-body-preview' })).toBeUndefined()

    await ui.input({ key: 'new-body', text: long, kind: 'change' })
    expect(await ui.find({ key: 'new-body-preview' })).toMatchObject({ text: long })

    await ui.input({ key: 'new-body', text: '請廠商確認延遲出貨的新日期' + '並回覆客戶', kind: 'change' })
    expect(await ui.find({ key: 'new-body-preview' })).toBeDefined()

    await ui.input({ key: 'new-body', text: long })
    expect(await ui.find({ key: 'new-body-preview' })).toBeUndefined()

    await ui.press({ key: 'edit-btn-1' })
    expect(await ui.find({ key: 'edit-body-preview-1' })).toMatchObject({ text: long })
  })
}

test('mobile shows the notes read-only', async $ => {
  const ui = await $.ui.mount({
    plugin: 'session-notes',
    surface: 'mobile',
    component: 'Pane',
    requestId: 'session-notes',
    props: { ...paneProps(10), isFocused: false, placement: 'inline' },
  })

  expect(await ui.find({ type: 'Text', text: 'No notes yet.' })).toBeDefined()
})
