import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

const paneProps = (bodyRows: number) => ({
  title: '記事',
  isFocused: true,
  bodyColumns: 40,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows },
  view: {},
})

for (const surface of SURFACES) {
  test(`${surface}: 標題與內容分開新增、修改、刪除`, async $ => {
    const ui = await $.ui.mount({
      plugin: 'session-notes',
      surface,
      component: 'Pane',
      requestId: 'session-notes',
      props: paneProps(20),
    })

    expect(await ui.find({ type: 'Text', text: '尚無記事。' })).toBeDefined()

    await ui.input({ key: 'new-title', text: '採買', kind: 'change' })
    await ui.input({ key: 'new-body', text: '  牛奶、雞蛋  ' })
    expect(await ui.find({ key: 'toggle-1' })).toMatchObject({ props: { label: '▾ 1. 採買' } })
    expect(await ui.find({ type: 'Text', text: '牛奶、雞蛋' })).toBeDefined()
    expect((await ui.find({ key: 'new-title' }))?.props.value).toBe('')
    expect((await ui.find({ key: 'new-body' }))?.props.value).toBe('')

    await ui.input({ key: 'new-body', text: '   ' })
    await ui.input({ key: 'new-body', text: '回覆 MR' })
    expect(await ui.find({ key: 'toggle-2' })).toMatchObject({ props: { label: '▾ 2. （無標題）' } })
    expect(await ui.find({ key: 'toggle-3' })).toBeUndefined()

    await ui.press({ key: 'edit-btn-1' })
    expect((await ui.find({ key: 'edit-title-1' }))?.props.value).toBe('採買')
    expect((await ui.find({ key: 'edit-body-1' }))?.props.value).toBe('牛奶、雞蛋')
    await ui.input({ key: 'edit-title-1', text: '超市', kind: 'change' })
    await ui.press({ key: 'save-1' })
    expect(await ui.find({ key: 'toggle-1' })).toMatchObject({ props: { label: '▾ 1. 超市' } })
    expect(await ui.find({ key: 'edit-title-1' })).toBeUndefined()

    await ui.press({ key: 'edit-btn-2' })
    await ui.input({ key: 'edit-body-2', text: '改掉', kind: 'change' })
    await ui.press({ key: 'cancel-2' })
    expect(await ui.find({ type: 'Text', text: '回覆 MR' })).toBeDefined()

    await ui.press({ key: 'del-1' })
    expect(await ui.find({ key: 'toggle-1' })).toBeUndefined()
    expect(await ui.find({ key: 'toggle-2' })).toMatchObject({ props: { label: '▾ 1. （無標題）' } })

    await ui.press({ key: 'edit-btn-2' })
    await ui.input({ key: 'edit-title-2', text: '', kind: 'change' })
    await ui.input({ key: 'edit-body-2', text: '' })
    expect(await ui.find({ type: 'Text', text: '尚無記事。' })).toBeDefined()
  })

  test(`${surface}: 單則與全部收合、展開`, async $ => {
    const ui = await $.ui.mount({
      plugin: 'session-notes',
      surface,
      component: 'Pane',
      requestId: 'session-notes',
      props: paneProps(20),
    })
    await ui.input({ key: 'new-title', text: '甲', kind: 'change' })
    await ui.input({ key: 'new-body', text: '甲內容' })
    await ui.input({ key: 'new-title', text: '乙', kind: 'change' })
    await ui.input({ key: 'new-body', text: '乙內容' })

    await ui.press({ key: 'toggle-1' })
    expect(await ui.find({ key: 'toggle-1' })).toMatchObject({ props: { label: '▸ 1. 甲' } })
    expect(await ui.find({ type: 'Text', text: '甲內容' })).toBeUndefined()
    expect(await ui.find({ key: 'edit-btn-1' })).toMatchObject({ props: { label: '✎' } })
    expect(await ui.find({ key: 'del-1' })).toMatchObject({ props: { label: '✕' } })
    expect(await ui.find({ type: 'Text', text: '乙內容' })).toBeDefined()

    await ui.press({ key: 'toggle-1' })
    expect(await ui.find({ type: 'Text', text: '甲內容' })).toBeDefined()

    await ui.press({ key: 'collapse-all' })
    expect(await ui.find({ type: 'Text', text: '甲內容' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: '乙內容' })).toBeUndefined()

    await ui.press({ key: 'expand-all' })
    expect(await ui.find({ type: 'Text', text: '甲內容' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '乙內容' })).toBeDefined()
  })

  test(`${surface}: 記事多時不截斷，交給面板捲動`, async $ => {
    const ui = await $.ui.mount({
      plugin: 'session-notes',
      surface,
      component: 'Pane',
      requestId: 'session-notes',
      props: paneProps(5),
    })
    for (let i = 1; i <= 12; i += 1) {
      await ui.input({ key: 'new-body', text: `第${i}則` })
    }

    expect(await ui.find({ key: 'toggle-12' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '第12則' })).toBeDefined()
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
      ? [{ id: 'session-notes', title: '記事', isShown: placed, isFocused: false, isPlaced: placed }]
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

test('session 開始預設開啟便籤，不顯示展開列', async ($, on) => {
  const calls = fakeEngine(on, true)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  expect(calls).toEqual(['open:session-notes'])

  const band = await mountBand($)
  expect(await band.find({ key: 'expand-pane' })).toBeUndefined()
})

test('終端太窄放不下時改顯示展開列', async ($, on) => {
  fakeEngine(on, false)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  const band = await mountBand($)
  expect(await band.find({ key: 'expand-pane' })).toBeDefined()
})

test('按收合關閉面板並出現展開列，按展開列再打開', async ($, on) => {
  const calls = fakeEngine(on, true)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })
  const pane = await $.ui.mount({
    plugin: 'session-notes',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'session-notes',
    props: paneProps(20),
  })
  await pane.input({ key: 'new-body', text: '甲' })

  await pane.press({ key: 'collapse-pane' })
  expect(calls).toEqual(['open:session-notes', 'close:session-notes'])

  const band = await mountBand($)
  expect(await band.find({ key: 'expand-pane' })).toMatchObject({ props: { label: '▸ 記事 1 則' } })

  await band.press({ key: 'expand-pane' })
  expect(calls).toEqual(['open:session-notes', 'close:session-notes', 'open:session-notes'])
  expect(await band.find({ key: 'expand-pane' })).toBeUndefined()
})

test('/notes 切換收合與展開', async ($, on) => {
  const calls = fakeEngine(on, true)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect((await runNotes($)).text).toBe('記事便籤已收合。')
  expect((await runNotes($)).text).toBe('記事便籤已展開。')
  expect(calls).toEqual(['open:session-notes', 'close:session-notes', 'open:session-notes'])
})

test('/notes 在終端太窄時說明原因，再按一次可收合', async ($, on) => {
  const calls = fakeEngine(on, false)
  await $.session.start({ cwd: '/tmp', surface: 'terminal', isInteractive: true })

  expect((await runNotes($)).text).toBe('記事便籤已開啟，但目前放不下：too narrow')
  expect((await runNotes($)).text).toBe('記事便籤已收合。')
  expect(calls).toEqual(['open:session-notes', 'open:session-notes', 'close:session-notes'])
})

test('mobile 只顯示記事清單', async $ => {
  const ui = await $.ui.mount({
    plugin: 'session-notes',
    surface: 'mobile',
    component: 'Pane',
    requestId: 'session-notes',
    props: { ...paneProps(10), isFocused: false, placement: 'inline' },
  })

  expect(await ui.find({ type: 'Text', text: '尚無記事。' })).toBeDefined()
})
