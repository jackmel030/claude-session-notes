import { expect, test } from 'claude-code/testing'

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

test('/notes 開啟便籤', async ($, on) => {
  const opened: string[] = []
  on('ui.open', async (_, e) => {
    opened.push(e.id)
    return { value: { isPlaced: true } }
  })
  const answer = await $.command.run({
    command: 'notes',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: true, columns: 160 },
  })
  expect(answer.text).toBe('記事便籤已開啟。')
  expect(opened).toEqual(['session-notes'])
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
