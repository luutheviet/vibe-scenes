import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Prefs } from '../types'
import { OFF, SCENES, byId, findScene, lookOf, sceneSvg } from './scenes'

const PLUGIN = 'vibe-scenes'
const PICKER = 'vibe-scenes-picker'
const STORE_KEY = 'prefs'
const DEFAULTS: Prefs = { scene: OFF }

// Đổi tag khi Prefs đổi cấu trúc: giá trị bản cũ lưu lại sẽ bị bỏ qua.
// plugin và key phải viết thẳng bằng chuỗi để engine liệt kê được state của mod.
const prefs = atom({ plugin: 'vibe-scenes', key: 'prefs' } as const, DEFAULTS, { shape: 'prefs-1' })

/** Đọc lại lựa chọn đã lưu; giá trị lạ (cảnh đã bị xoá...) thì về mặc định. */
function restore(saved: unknown): Prefs {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Partial<Prefs>
  const ok = typeof s.scene === 'string' && (s.scene === OFF || byId(s.scene) !== undefined)
  return { scene: ok ? (s.scene as string) : DEFAULTS.scene }
}

const label = (id: string) => (id === OFF ? 'Tắt hình nền' : (byId(id)?.name ?? id))

/** Áp cảnh lên app. Trả về lý do nếu chưa vẽ được (vd: đang ở terminal). */
async function apply($: EngineInterface, id: string): Promise<string | undefined> {
  if (id === OFF) {
    // Chỉ gọi khi chính người dùng chọn tắt: clear xoá theme của mọi mod.
    await $.theme.clear()
    return undefined
  }
  const look = lookOf(id)
  if (!look) return `không có cảnh "${id}"`
  const res = await $.theme.set(look)
  return res.isDrawn ? undefined : res.reason
}

/** Người dùng chọn một cảnh: lưu cho phiên này, cho các phiên sau, rồi áp. */
async function choose($: EngineInterface, id: string): Promise<string> {
  await update($, prefs, () => ({ scene: id }))
  await $.store.set(STORE_KEY, { scene: id })
  const why = await apply($, id)
  if (id === OFF) return 'Đã tắt hình nền, app về giao diện gốc.'
  return why ? `Đã chọn ${label(id)}, nhưng chưa vẽ được: ${why}` : `Đã đổi sang cảnh ${label(id)}.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'canh',
      description: 'Hình nền động: mở bảng chọn, hoặc /canh <tên cảnh>, /canh off',
      argumentHint: '[bien-dem | ruong | den-long | tre | off]',
    })
    const p = restore(await $.store.get(STORE_KEY))
    await update($, prefs, () => p)
    // Không clear ở đây: nếu đang tắt thì để yên theme của mod khác (nếu có).
    if (p.scene !== OFF) {
      const look = lookOf(p.scene)
      if (look) await $.theme.set(look)
    }

    return next(e)
  })

  on('command.run', { command: 'canh' }, async ($, e) => {
    const arg = e.args.trim()
    if (!arg) {
      await $.ui.open({ id: PICKER, title: 'Chọn hình nền', focus: true, closeOnEscape: true })
      return { text: 'Đã mở bảng chọn hình nền.' }
    }
    const id = findScene(arg)
    if (!id) {
      return { text: `Không có cảnh "${arg}". Các cảnh: ${SCENES.map(s => s.id).join(', ')}, off.` }
    }

    return { text: await choose($, id) }
  })

  // Bảng chọn: ảnh thu nhỏ trên desktop/điện thoại, danh sách nút trên terminal.
  on('ui.render', { component: 'Pane', requestId: PICKER }, async ($, e) => {
    const p = await read($, prefs)
    const pick = (id: string) => async () => {
      await choose($, id)
    }
    const mark = (id: string) => (id === p.scene ? '✓ ' : '')

    if (e.surface === 'terminal') {
      const { Box, Button, Text } = $.ui.resolve(e)

      return (
        <Box flexDirection="column">
          <Text dimColor>Hình nền chỉ hiện trong app Desktop và điện thoại; ở terminal chỉ lưu lựa chọn.</Text>
          {[...SCENES.map(s => s.id), OFF].map(id => (
            <Button key={id} plain onPress={pick(id)}>
              {mark(id)}
              {label(id)}
            </Button>
          ))}
        </Box>
      )
    }

    const { Box, Button, Svg, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {SCENES.map(s => (
            <Box key={`card-${s.id}`} flexDirection="column">
              <Svg source={sceneSvg(s.id)} alt={`${s.name}: ${s.desc}`} width={192} height={108} />
              <Button key={s.id} plain onPress={pick(s.id)}>
                {mark(s.id)}
                {s.name}
              </Button>
              <Text dimColor>{s.desc}</Text>
            </Box>
          ))}
        </Box>
        <Button key={OFF} label={`${mark(OFF)}${label(OFF)}`} onPress={pick(OFF)} />
      </Box>
    )
  })

  // Hình nền toàn cửa sổ. Chỉ vẽ backdrop do chính mod này đặt.
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== PLUGIN) return next(e)
    const s = byId(e.props.scene)
    if (!s || (e.surface !== 'desktop' && e.surface !== 'mobile')) return next(e)
    const { Svg } = $.ui.resolve(e)

    return <Svg source={sceneSvg(s.id)} alt={`${s.name}: ${s.desc}`} isInteractive />
  })
}
