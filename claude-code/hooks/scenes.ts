import type { ThemeBackdropGlass, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

/*
 * Mỗi cảnh = một SVG tự chuyển động bằng CSS (không script, không tải gì từ ngoài)
 * + một bảng màu cho app. Muốn thêm cảnh: viết một hàm draw trả về phần thân SVG,
 * rồi thêm một mục vào mảng SCENES ở cuối file.
 *
 * Bố cục: khung 1600x900, phủ kín màn hình (slice). Chi tiết đặt ở mép trên và
 * hai bên; giữa màn hình (nơi có chữ) và mép dưới (ô chat) để thoáng.
 */

export const OFF = 'off'

type Mode = 'light' | 'dark'

type Palette = {
  roles: { accent: string; danger: string; success: string; warning: string; pro: string }
  anchors: {
    'surface-0': string
    'surface-1': string
    'surface-2': string
    'surface-3': string
    'text-primary': string
    'text-secondary': string
    'text-muted': string
  }
}

export type Scene = {
  id: string
  name: string
  desc: string
  /** Tên gõ nhanh, viết không dấu. */
  alias: string[]
  mode: Mode
  palette: Palette
  glass: ThemeBackdropGlass
  /** Phần thân SVG: { defs, style, body }. */
  draw: () => { defs: string; style: string; body: string }
}

const W = 1600
const H = 900

/* ------------------------------------------------------------ tiện ích vẽ */

/** Số ngẫu nhiên có seed: cùng seed thì cùng hình, SVG ổn định giữa các lần vẽ. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = (v: number) => String(Math.round(v * 10) / 10)

const pick = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)] as T

/** Đường sóng sin từ x=0 tới `width`, đóng xuống đáy khung. */
function wave(width: number, baseY: number, amp: number, len: number): string {
  let d = `M0 ${n(baseY)}`
  for (let x = 0; x <= width; x += 20) {
    d += ` L${x} ${n(baseY + Math.sin((x / len) * Math.PI * 2) * amp)}`
  }
  return `${d} L${width} ${H} L0 ${H} Z`
}

/** Chung cho mọi cảnh: tôn trọng chế độ "giảm chuyển động" của hệ điều hành. */
const REDUCED = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'

function wrap(defs: string, style: string, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img">` +
    `<defs>${defs}</defs><style>${style}${REDUCED}</style>${body}</svg>`
  )
}

/* ------------------------------------------------------------ 1. Biển đêm */

function drawSeaNight() {
  const r = rng(11)
  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#081128"/><stop offset=".65" stop-color="#1a2b57"/><stop offset="1" stop-color="#2b3f74"/></linearGradient>' +
    '<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#15264f"/><stop offset="1" stop-color="#070f24"/></linearGradient>' +
    '<radialGradient id="glow"><stop offset="0" stop-color="#fff3c4" stop-opacity=".55"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>'
  const style =
    '.tw{animation:tw 4s ease-in-out infinite}' +
    '@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}' +
    '.glow{animation:pulse 7s ease-in-out infinite}' +
    '@keyframes pulse{0%,100%{opacity:.7}50%{opacity:1}}' +
    '.w1{animation:drift 26s linear infinite}.w2{animation:drift 38s linear infinite}.w3{animation:drift 52s linear infinite}' +
    `@keyframes drift{from{transform:translateX(0)}to{transform:translateX(-${W}px)}}` +
    '.sh{animation:sh 5s ease-in-out infinite}' +
    '@keyframes sh{0%,100%{opacity:.2}50%{opacity:.8}}' +
    '.shoot{opacity:0;animation:shoot 11s linear infinite}' +
    '@keyframes shoot{0%,86%{opacity:0;transform:translate(160px,40px)}88%{opacity:1}96%{opacity:0;transform:translate(640px,200px)}100%{opacity:0}}'

  let stars = ''
  for (let i = 0; i < 80; i++) {
    const x = r() * W
    const y = r() * 560
    const rad = 0.7 + r() * 1.8
    const dur = 3 + r() * 4
    const delay = -r() * 7
    stars += `<circle class="tw" cx="${n(x)}" cy="${n(y)}" r="${n(rad)}" fill="#fdf8e8" style="animation-duration:${n(dur)}s;animation-delay:${n(delay)}s"/>`
  }

  let shimmer = ''
  for (let i = 0; i < 9; i++) {
    const y = 680 + i * 22
    const half = 70 - i * 5 + r() * 20
    shimmer += `<rect class="sh" x="${n(1330 - half)}" y="${y}" width="${n(half * 2)}" height="3" rx="1.5" fill="#fff1bf" style="animation-delay:${n(-r() * 5)}s"/>`
  }

  const body =
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    stars +
    '<circle class="glow" cx="1330" cy="170" r="170" fill="url(#glow)"/>' +
    '<circle cx="1330" cy="170" r="46" fill="#fdf3cf"/>' +
    '<circle cx="1315" cy="160" r="7" fill="#efe2b4" opacity=".7"/><circle cx="1345" cy="185" r="5" fill="#efe2b4" opacity=".6"/>' +
    '<g class="shoot"><line x1="0" y1="0" x2="-130" y2="-42" stroke="url(#tail)" stroke-width="2.4" stroke-linecap="round"/></g>' +
    `<rect y="650" width="${W}" height="${H - 650}" fill="url(#sea)"/>` +
    shimmer +
    `<g class="w3"><path d="${wave(W * 2, 660, 6, 400)}" fill="#1d3263" opacity=".55"/></g>` +
    `<g class="w2"><path d="${wave(W * 2, 720, 8, 320)}" fill="#162a56" opacity=".6"/></g>` +
    `<g class="w1"><path d="${wave(W * 2, 790, 10, 400)}" fill="#0e1d42" opacity=".75"/></g>`

  return { defs, style, body }
}

/* ------------------------------------------------------ 2. Ruộng bậc thang */

function cloud(cx: number, cy: number, s: number): string {
  const blobs: [number, number, number][] = [
    [0, 0, 46],
    [-50, 12, 34],
    [52, 10, 38],
    [-92, 24, 22],
    [96, 24, 24],
  ]
  return blobs
    .map(([dx, dy, rad]) => `<circle cx="${n(cx + dx * s)}" cy="${n(cy + dy * s)}" r="${n(rad * s)}"/>`)
    .join('') + `<rect x="${n(cx - 110 * s)}" y="${n(cy + 18 * s)}" width="${n(220 * s)}" height="${n(28 * s)}" rx="${n(14 * s)}"/>`
}

function drawTerraces() {
  const r = rng(22)
  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#9fd2ee"/><stop offset=".55" stop-color="#e6f3f6"/><stop offset="1" stop-color="#fbf0d2"/></linearGradient>' +
    '<radialGradient id="sun"><stop offset="0" stop-color="#fff3c2"/><stop offset=".35" stop-color="#ffd86e" stop-opacity=".9"/><stop offset="1" stop-color="#ffd86e" stop-opacity="0"/></radialGradient>'
  const style =
    '.rays{transform-origin:230px 170px;animation:spin 80s linear infinite}' +
    '@keyframes spin{to{transform:rotate(360deg)}}' +
    '.cl{animation:float linear infinite}' +
    '@keyframes float{from{transform:translateX(-500px)}to{transform:translateX(2100px)}}' +
    '.flock{animation:fly 46s linear infinite}' +
    '@keyframes fly{from{transform:translateX(-300px)}to{transform:translateX(1900px)}}' +
    '.bird{transform-box:fill-box;transform-origin:center;animation:flap .9s ease-in-out infinite}' +
    '@keyframes flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.35)}}'

  let rays = ''
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const x1 = 230 + Math.cos(a) * 80
    const y1 = 170 + Math.sin(a) * 80
    const x2 = 230 + Math.cos(a) * 135
    const y2 = 170 + Math.sin(a) * 135
    rays += `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}"/>`
  }

  let clouds = ''
  const rows = [95, 160, 230, 130]
  rows.forEach((y, i) => {
    const dur = 70 + i * 22
    clouds += `<g class="cl" fill="#ffffff" opacity="${n(0.75 + r() * 0.2)}" style="animation-duration:${dur}s;animation-delay:${n(-r() * dur)}s">${cloud(0, y, 0.7 + r() * 0.5)}</g>`
  })

  let birds = ''
  for (let i = 0; i < 5; i++) {
    const x = i * 38 + r() * 14
    const y = 150 + (i % 2) * 18 + r() * 10
    birds += `<path class="bird" style="animation-delay:${n(-r())}s" d="M${n(x)} ${n(y)} q8 -9 16 0 q8 -9 16 0" fill="none" stroke="#3e4a3a" stroke-width="2.2" stroke-linecap="round"/>`
  }

  // Ruộng: các dải lượn sóng xếp chồng, sáng dần lên phía trên như nắng sớm.
  const fields = ['#c8d97a', '#a6cb63', '#8dbd53', '#77aa45', '#5f933a', '#4c7f31']
  let terraces = ''
  fields.forEach((fill, i) => {
    const y = 610 + i * 52
    const d = wave(W, y, 10 + i * 2, 520 - i * 40)
    terraces += `<path d="${d}" fill="${fill}"/>`
    terraces += `<path d="${d.split(' L' + W + ' ' + H)[0]}" fill="none" stroke="#eef4c4" stroke-width="2" opacity=".7"/>`
  })

  const body =
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    '<circle cx="230" cy="170" r="150" fill="url(#sun)"/>' +
    `<g class="rays" stroke="#ffcf5a" stroke-width="5" stroke-linecap="round" opacity=".55">${rays}</g>` +
    '<circle cx="230" cy="170" r="58" fill="#ffdc7a"/>' +
    clouds +
    `<g class="flock">${birds}</g>` +
    '<path d="M0 600 L140 520 L260 570 L420 470 L560 560 L700 510 L860 580 L1010 490 L1180 560 L1320 480 L1460 540 L1600 500 L1600 640 L0 640 Z" fill="#a8c6cf" opacity=".85"/>' +
    '<path d="M0 630 L180 560 L330 610 L500 540 L680 610 L900 560 L1080 620 L1260 550 L1420 600 L1600 560 L1600 660 L0 660 Z" fill="#86afab"/>' +
    terraces

  return { defs, style, body }
}

/* ------------------------------------------------------- 3. Phố đèn lồng */

/** Điểm trên đường cong bậc 2 (dây treo đèn). */
function quad(t: number, p0: number[], p1: number[], p2: number[]): [number, number] {
  const u = 1 - t
  const x = u * u * (p0[0] ?? 0) + 2 * u * t * (p1[0] ?? 0) + t * t * (p2[0] ?? 0)
  const y = u * u * (p0[1] ?? 0) + 2 * u * t * (p1[1] ?? 0) + t * t * (p2[1] ?? 0)
  return [x, y]
}

function drawLanterns() {
  const r = rng(33)
  const colors = ['#e8463a', '#f2a33a', '#e8608c', '#f6c453', '#d9542f']
  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#140b1b"/><stop offset=".6" stop-color="#2a1430"/><stop offset="1" stop-color="#3a1a2c"/></linearGradient>' +
    '<radialGradient id="lg"><stop offset="0" stop-color="#ffb35c" stop-opacity=".55"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>'
  const style =
    '.sway{animation:sway ease-in-out infinite alternate}' +
    '@keyframes sway{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}' +
    '.fl{animation:fl 2.6s ease-in-out infinite}' +
    '@keyframes fl{0%,100%{opacity:.75}45%{opacity:1}70%{opacity:.85}}' +
    '.em{animation:rise linear infinite}' +
    '@keyframes rise{0%{transform:translateY(0);opacity:0}15%{opacity:.9}100%{transform:translateY(-520px);opacity:0}}'

  const strings: number[][][] = [
    [[-20, 30], [420, 170], [860, 40]],
    [[740, 34], [1180, 180], [1620, 30]],
  ]
  let wires = ''
  let lanterns = ''
  strings.forEach(([p0, p1, p2], si) => {
    if (!p0 || !p1 || !p2) return
    wires += `<path d="M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}" fill="none" stroke="#5a3a3a" stroke-width="2"/>`
    for (let i = 1; i <= 6; i++) {
      const [x, y] = quad(i / 7, p0, p1, p2)
      const drop = 26 + r() * 30
      const fill = pick(r, colors)
      const cy = y + drop + 30
      const dur = 3 + r() * 2.5
      lanterns +=
        `<g class="sway" style="transform-origin:${n(x)}px ${n(y)}px;animation-duration:${n(dur)}s;animation-delay:${n(-r() * dur)}s">` +
        `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x)}" y2="${n(y + drop)}" stroke="#5a3a3a" stroke-width="1.5"/>` +
        `<circle class="fl" cx="${n(x)}" cy="${n(cy)}" r="70" fill="url(#lg)" style="animation-delay:${n(-r() * 3)}s"/>` +
        `<rect x="${n(x - 11)}" y="${n(y + drop)}" width="22" height="6" rx="2" fill="#3b2420"/>` +
        `<ellipse cx="${n(x)}" cy="${n(cy)}" rx="24" ry="28" fill="${fill}"/>` +
        `<path d="M${n(x - 14)} ${n(cy - 24)} Q${n(x - 22)} ${n(cy)} ${n(x - 14)} ${n(cy + 24)} M${n(x + 14)} ${n(cy - 24)} Q${n(x + 22)} ${n(cy)} ${n(x + 14)} ${n(cy + 24)} M${n(x)} ${n(cy - 28)} L${n(x)} ${n(cy + 28)}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.5"/>` +
        `<rect x="${n(x - 11)}" y="${n(cy + 26)}" width="22" height="6" rx="2" fill="#3b2420"/>` +
        `<line x1="${n(x)}" y1="${n(cy + 32)}" x2="${n(x)}" y2="${n(cy + 50 + si * 4)}" stroke="${fill}" stroke-width="2"/>` +
        '</g>'
    }
  })

  let embers = ''
  for (let i = 0; i < 34; i++) {
    const side = i % 2 === 0
    const x = side ? r() * 320 : W - r() * 320
    const dur = 9 + r() * 9
    embers += `<circle class="em" cx="${n(x)}" cy="${n(880 - r() * 60)}" r="${n(1.2 + r() * 2)}" fill="#ffc06b" style="animation-duration:${n(dur)}s;animation-delay:${n(-r() * dur)}s"/>`
  }

  // Mái ngói cong ở hai góc dưới, để trống khoảng giữa cho ô chat.
  const roofs =
    '<path d="M0 760 Q60 700 150 712 L330 712 Q380 700 420 676 Q410 724 380 740 L380 900 L0 900 Z" fill="#1b0f19"/>' +
    '<path d="M0 820 L260 820 L260 900 L0 900 Z" fill="#140a12"/>' +
    '<rect x="60" y="760" width="40" height="52" rx="4" fill="#f2a33a" opacity=".55"/>' +
    '<rect x="210" y="760" width="40" height="52" rx="4" fill="#f2a33a" opacity=".4"/>' +
    `<path d="M${W} 740 Q${W - 70} 690 ${W - 170} 700 L${W - 340} 700 Q${W - 390} 690 ${W - 440} 664 Q${W - 428} 712 ${W - 398} 730 L${W - 398} 900 L${W} 900 Z" fill="#1b0f19"/>` +
    `<rect x="${W - 130}" y="752" width="40" height="52" rx="4" fill="#f2a33a" opacity=".5"/>` +
    `<rect x="${W - 290}" y="752" width="40" height="52" rx="4" fill="#e8608c" opacity=".35"/>`

  const body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + embers + wires + lanterns + roofs

  return { defs, style, body }
}

/* ------------------------------------------------------------ 4. Rừng tre */

function leaf(x: number, y: number, len: number, angle: number, fill: string): string {
  return `<path d="M0 0 Q${n(len * 0.45)} ${n(-len * 0.16)} ${n(len)} 0 Q${n(len * 0.45)} ${n(len * 0.16)} 0 0 Z" fill="${fill}" transform="translate(${n(x)} ${n(y)}) rotate(${n(angle)})"/>`
}

function drawBamboo() {
  const r = rng(44)
  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#e3f0d3"/><stop offset=".6" stop-color="#f6f8ec"/><stop offset="1" stop-color="#dfe9cc"/></linearGradient>' +
    '<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe6" stop-opacity=".7"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></linearGradient>'
  const style =
    '.st{animation:sw ease-in-out infinite alternate}' +
    '@keyframes sw{from{transform:rotate(-1.1deg)}to{transform:rotate(1.1deg)}}' +
    '.ray{animation:ray 9s ease-in-out infinite}' +
    '@keyframes ray{0%,100%{opacity:.35}50%{opacity:.75}}' +
    '.fall{animation:fall linear infinite}' +
    `@keyframes fall{from{transform:translate(0,-60px) rotate(0deg)}to{transform:translate(220px,${H + 60}px) rotate(540deg)}}`

  const rays =
    '<polygon class="ray" points="520,0 640,0 860,900 600,900" fill="url(#ray)"/>' +
    '<polygon class="ray" points="900,0 960,0 1120,900 980,900" fill="url(#ray)" style="animation-delay:-3s"/>' +
    '<polygon class="ray" points="1100,0 1190,0 1380,900 1220,900" fill="url(#ray)" style="animation-delay:-6s"/>'

  const greens = ['#6f9a4a', '#7fa955', '#86b05c', '#5f8a3e']
  const leafGreens = ['#5d8f38', '#6fa046', '#4f7f30']
  let stalks = ''
  const xs: number[] = []
  for (let i = 0; i < 7; i++) xs.push(20 + i * 46 + r() * 20)
  for (let i = 0; i < 7; i++) xs.push(W - 20 - i * 46 - r() * 20)
  xs.forEach((x, i) => {
    const w = 16 + r() * 10
    const fill = pick(r, greens)
    const far = i % 7 > 3
    let rings = ''
    let leaves = ''
    for (let y = 60 + r() * 60; y < H; y += 110 + r() * 40) {
      rings += `<rect x="${n(x - w / 2 - 1)}" y="${n(y)}" width="${n(w + 2)}" height="4" rx="2" fill="#4c6f33"/>`
      if (r() < 0.55) {
        const toRight = x < W / 2
        const dir = toRight ? 1 : -1
        const base = toRight ? -18 : 198
        for (let k = 0; k < 3; k++) {
          leaves += leaf(x + (dir * w) / 2, y + 2, 46 + r() * 30, base + dir * (k * 16 + r() * 8), pick(r, leafGreens))
        }
      }
    }
    const dur = 5 + r() * 4
    stalks +=
      `<g class="st" opacity="${far ? '.7' : '1'}" style="transform-origin:${n(x)}px ${H}px;animation-duration:${n(dur)}s;animation-delay:${n(-r() * dur)}s">` +
      `<rect x="${n(x - w / 2)}" y="-20" width="${n(w)}" height="${H + 40}" rx="${n(w / 2)}" fill="${fill}"/>` +
      `<rect x="${n(x - w / 2 + 3)}" y="-20" width="3" height="${H + 40}" fill="#ffffff" opacity=".18"/>` +
      rings +
      leaves +
      '</g>'
  })

  let falling = ''
  for (let i = 0; i < 16; i++) {
    const x = r() * (W - 200)
    const dur = 14 + r() * 10
    falling += `<g class="fall" style="animation-duration:${n(dur)}s;animation-delay:${n(-r() * dur)}s" opacity=".75">${leaf(x, 0, 22 + r() * 10, r() * 360, pick(r, leafGreens))}</g>`
  }

  const body = `<rect width="${W}" height="${H}" fill="url(#sky)"/>` + rays + stalks + falling

  return { defs, style, body }
}

/* --------------------------------------------------------- danh sách cảnh */

export const SCENES: readonly Scene[] = [
  {
    id: 'bien-dem',
    name: 'Biển đêm',
    desc: 'Trăng sáng, sao lấp lánh, sóng biển trôi',
    alias: ['bien', 'dem', 'trang', 'moon', 'sea'],
    mode: 'dark',
    glass: { blur: 18, tint: '#0d1733', opacity: 0.58 },
    palette: {
      roles: { accent: '#7fa8ff', danger: '#ff6b6b', success: '#5ccf9a', warning: '#f5c15c', pro: '#b48cff' },
      anchors: {
        'surface-0': '#0c1530',
        'surface-1': '#111c3b',
        'surface-2': '#162345',
        'surface-3': '#1a284c',
        'text-primary': '#eef2ff',
        'text-secondary': '#c6cde6',
        'text-muted': '#a2acca',
      },
    },
    draw: drawSeaNight,
  },
  {
    id: 'ruong-bac-thang',
    name: 'Ruộng bậc thang',
    desc: 'Nắng sớm, mây trôi, đàn chim, ruộng lúa',
    alias: ['ruong', 'lua', 'sapa', 'rice'],
    mode: 'light',
    glass: { blur: 16, tint: '#f7f9ef', opacity: 0.62 },
    palette: {
      roles: { accent: '#2b6f9e', danger: '#b23a2e', success: '#3f7f2f', warning: '#a7700f', pro: '#6c4f96' },
      anchors: {
        'surface-0': '#eaf0dc',
        'surface-1': '#f2f6e8',
        'surface-2': '#f9fbf3',
        'surface-3': '#f9fbf3',
        'text-primary': '#1d2816',
        'text-secondary': '#3b4a31',
        'text-muted': '#56654a',
      },
    },
    draw: drawTerraces,
  },
  {
    id: 'den-long',
    name: 'Phố đèn lồng',
    desc: 'Đèn lồng đung đưa, đốm lửa bay, mái ngói cổ',
    alias: ['den', 'long', 'hoi an', 'pho', 'lantern'],
    mode: 'dark',
    glass: { blur: 18, tint: '#1a1020', opacity: 0.6 },
    palette: {
      roles: { accent: '#f2a33a', danger: '#ef5a4c', success: '#7cc48a', warning: '#f6c453', pro: '#c99cf0' },
      anchors: {
        'surface-0': '#180f1d',
        'surface-1': '#201526',
        'surface-2': '#271a2e',
        'surface-3': '#2c1e34',
        'text-primary': '#fbeee6',
        'text-secondary': '#dfcac3',
        'text-muted': '#bba5a3',
      },
    },
    draw: drawLanterns,
  },
  {
    id: 'rung-tre',
    name: 'Rừng tre',
    desc: 'Tre đung đưa, nắng xuyên lá, lá rơi',
    alias: ['tre', 'rung', 'bamboo'],
    mode: 'light',
    glass: { blur: 16, tint: '#f6f9ef', opacity: 0.62 },
    palette: {
      roles: { accent: '#2f6f5e', danger: '#b03d32', success: '#4a8a2c', warning: '#9c6b12', pro: '#6b5296' },
      anchors: {
        'surface-0': '#e9f0df',
        'surface-1': '#f1f6e9',
        'surface-2': '#f8fbf3',
        'surface-3': '#f8fbf3',
        'text-primary': '#1b2917',
        'text-secondary': '#384a31',
        'text-muted': '#53654a',
      },
    },
    draw: drawBamboo,
  },
]

/* ----------------------------------------------------------- tra cứu, dựng */

export const byId = (id: string): Scene | undefined => SCENES.find(s => s.id === id)

/** Bỏ dấu tiếng Việt, viết thường: "Biển Đêm" -> "bien dem". */
const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .trim()

/** Tìm cảnh theo id, tên hoặc tên gõ nhanh; `off`/`tat` trả về OFF. */
export function findScene(query: string): string | undefined {
  const q = plain(query)
  if (!q) return undefined
  if (q === 'off' || q === 'tat') return OFF
  const exact = SCENES.find(s => plain(s.id) === q || plain(s.name) === q || s.alias.includes(q))
  if (exact) return exact.id
  const near = SCENES.find(s => plain(s.id).startsWith(q) || plain(s.name).includes(q) || s.alias.some(a => a.startsWith(q)))
  return near?.id
}

// SVG và bảng màu được dựng một lần cho mỗi cảnh rồi giữ lại.
const svgCache = new Map<string, string>()

export function sceneSvg(id: string): string {
  const hit = svgCache.get(id)
  if (hit !== undefined) return hit
  const s = byId(id)
  if (!s) return ''
  const { defs, style, body } = s.draw()
  const out = wrap(defs, style, body)
  svgCache.set(id, out)
  return out
}

/** Bảng màu cho app; `problems` là cảnh báo độ tương phản của makeColors. */
export function colorsOf(id: string) {
  const s = byId(id)
  if (!s) return undefined
  return makeColors({
    label: s.name,
    id: `vibe-scenes-${s.id}`,
    only: s.mode,
    roles: s.palette.roles,
    [s.mode]: { gray: { anchors: s.palette.anchors } },
  })
}

// makeColors tính cả trăm màu kèm kiểm tra tương phản: dựng một lần mỗi cảnh rồi giữ lại,
// để lần áp lại (/clear, resume) không phải tính lại.
const lookCache = new Map<string, ThemeSetArgs>()

/** Toàn bộ "look" gửi cho $.theme.set: hình nền động + bảng màu. */
export function lookOf(id: string): ThemeSetArgs | undefined {
  const hit = lookCache.get(id)
  if (hit !== undefined) return hit
  const s = byId(id)
  const made = colorsOf(id)
  if (!s || !made) return undefined
  const look: ThemeSetArgs = {
    backdrop: { scene: s.id, glass: s.glass },
    colors: made.theme,
    overrideColorScheme: s.mode,
  }
  lookCache.set(id, look)
  return look
}
