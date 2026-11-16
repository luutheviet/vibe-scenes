import { expect, mock, test } from 'claude-code/testing'
import type { ThemeSetArgs } from 'claude-code'

import { OFF, SCENES, findScene, sceneSvg } from '../hooks/scenes'

const PICKER = {
  plugin: 'vibe-scenes',
  component: 'Pane',
  requestId: 'vibe-scenes-picker',
  props: {
    title: 'Chọn hình nền',
    isFocused: true,
    bodyColumns: 80,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

/** /scene <args> như người dùng gõ ở ô chat. */
const run = (args: string) => ({
  command: 'scene',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

test('mỗi cảnh là SVG an toàn, vừa giới hạn kích thước', async () => {
  for (const s of SCENES) {
    const svg = sceneSvg(s.id)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.length < 131072).toBe(true)
    expect(svg.includes('preserveAspectRatio="xMidYMid slice"')).toBe(true)
    // Không script, không handler, không tải gì từ ngoài.
    expect(/<script|\son\w+=|href=/i.test(svg)).toBe(false)
    expect(svg.replace('http://www.w3.org/2000/svg', '').includes('http')).toBe(false)
  }
})

test('tìm cảnh theo tên có dấu, không dấu, tên gõ nhanh', async () => {
  expect(findScene('Biển Đêm')).toBe('bien-dem')
  expect(findScene('hoi an')).toBe('den-long')
  expect(findScene('TRE')).toBe('rung-tre')
  expect(findScene('tắt')).toBe(OFF)
  expect(findScene('khong-co')).toBe(undefined)
})

test('/scene <tên> đặt hình nền và bảng màu, /scene off thì tắt', async ($, on) => {
  const sets: ThemeSetArgs[] = []
  let clears = 0
  mock.store(on)
  on('command.register', () => ({ value: { command: 'scene' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'theme-1' } }
  })
  on('theme.clear', () => {
    clears += 1
    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  // Mặc định là tắt, và lúc khởi động không được xoá theme của mod khác.
  expect(sets.length).toBe(0)
  expect(clears).toBe(0)

  const res = await $.command.run(run('tre'))
  expect(res.text).toBe('Đã đổi sang cảnh Rừng tre.')
  const look = sets[0]
  expect(look?.backdrop && 'scene' in look.backdrop ? look.backdrop.scene : undefined).toBe('rung-tre')
  expect(look?.colors !== undefined).toBe(true)
  expect(look?.overrideColorScheme).toBe('light')

  const off = await $.command.run(run('off'))
  expect(off.text).toBe('Đã tắt hình nền, app về giao diện gốc.')
  expect(clears).toBe(1)

  const bad = await $.command.run(run('xyz'))
  expect(bad.text?.startsWith('Không có cảnh "xyz"')).toBe(true)
})

test('bảng chọn dùng được trên terminal và desktop', async ($, on) => {
  const scenes: string[] = []
  mock.store(on)
  on('theme.set', (_, e) => {
    if (e.backdrop && 'scene' in e.backdrop && e.backdrop.scene) scenes.push(e.backdrop.scene)
    return { value: { isDrawn: true, requestId: 'theme-1' } }
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PICKER, surface })
    await ui.press({ key: 'den-long' })
    await ui.unmount()
  }
  expect(scenes).toEqual(['den-long', 'den-long'])

  // Sau khi chọn, lần vẽ sau đánh dấu cảnh đang dùng.
  const ui = await $.ui.mount({ ...PICKER, surface: 'terminal' })
  expect((await ui.find({ key: 'den-long' }))?.text).toBe('✓ Phố đèn lồng')
  await ui.unmount()
})

test('backdrop: vẽ cảnh của mình, để yên backdrop của mod khác', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const glass = { blur: 16, opacity: 0.6 }

  const mine = await $.ui.mount({
    plugin: 'vibe-scenes',
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'bien-dem', plugin: 'vibe-scenes', glass },
  })
  expect((await mine.find({ type: 'Svg' })) !== undefined).toBe(true)
  await mine.unmount()

  const other = await $.ui.mount({
    plugin: 'vibe-scenes',
    surface: 'desktop',
    component: 'Backdrop',
    props: { scene: 'bien-dem', plugin: 'mod-khac', glass },
  })
  expect((await other.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await other.unmount()
})

test('lựa chọn cũ không hợp lệ thì quay về mặc định', async ($, on) => {
  const sets: unknown[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'scene' } }))
  mock.store(on, { prefs: { scene: 'canh-da-xoa' } })
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'theme-1' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.length).toBe(0)
})

test('cảnh đã lưu được áp lại khi mở phiên mới', async ($, on) => {
  const sets: ThemeSetArgs[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'scene' } }))
  mock.store(on, { prefs: { scene: 'bien-dem' } })
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'theme-1' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const look = sets[0]
  expect(look?.backdrop && 'scene' in look.backdrop ? look.backdrop.scene : undefined).toBe('bien-dem')
  expect(look?.overrideColorScheme).toBe('dark')
})

test('hình nền được set trước khi đăng ký lệnh, để nền hiện sớm nhất', async ($, on) => {
  const order: string[] = []
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => {
    order.push('command')
    return { value: { command: 'scene' } }
  })
  mock.store(on, { prefs: { scene: 'den-long' } })
  on('theme.set', () => {
    order.push('theme')
    return { value: { isDrawn: true, requestId: 'theme-1' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(order).toEqual(['theme', 'command'])
})

test('/clear (new chat), resume, fork: áp lại cảnh đã lưu; startup và lúc tắt thì không', async ($, on) => {
  const scenes: string[] = []
  let clears = 0
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'scene' } }))
  on('classic.SessionStart', () => ({}))
  mock.store(on, { prefs: { scene: 'ruong-bac-thang' } })
  on('theme.set', (_, e) => {
    if (e.backdrop && 'scene' in e.backdrop && e.backdrop.scene) scenes.push(e.backdrop.scene)
    return { value: { isDrawn: true, requestId: 'theme-1' } }
  })
  on('theme.clear', () => {
    clears += 1
    return { value: { isDrawn: false, reason: 'cleared' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(scenes).toEqual(['ruong-bac-thang'])

  // startup đã do session.start lo: không set lần hai.
  await $.classic.SessionStart({ source: 'startup' })
  expect(scenes.length).toBe(1)

  for (const source of ['clear', 'resume', 'fork'] as const) {
    await $.classic.SessionStart({ source })
  }
  expect(scenes).toEqual(['ruong-bac-thang', 'ruong-bac-thang', 'ruong-bac-thang', 'ruong-bac-thang'])

  // Đang tắt: /clear không set, cũng không clear theme của mod khác.
  await $.command.run(run('off'))
  const before = scenes.length
  await $.classic.SessionStart({ source: 'clear' })
  expect(scenes.length).toBe(before)
  expect(clears).toBe(1)
})
