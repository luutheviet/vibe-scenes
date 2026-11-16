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

/*
 * Các cảnh từ đây trở xuống theo nguyên tắc "đọc chữ trước":
 * - vùng chữ (giữa màn hình) gần như một màu, độ tương phản thấp; chi tiết dồn ra mép;
 * - chuyển động chậm (chu kỳ từ 14s trở lên), biên độ nhỏ, không nhấp nháy;
 * - chỉ animate transform/opacity, không dùng filter (đỡ tốn GPU khi phủ toàn cửa sổ);
 * - id trong defs có tiền tố riêng của cảnh.
 */

/** Đốm sương mềm: elip trắng mờ dần ra mép (cần gradient `${id}` trong defs). */
function mist(id: string, cx: number, cy: number, rx: number, ry: number, opacity: number): string {
  return `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="url(#${id})" opacity="${n(opacity)}"/>`
}

/** Dãy núi răng cưa mềm từ x0 tới x1, đỉnh quanh `top`, đóng xuống đáy khung. */
function ridge(r: () => number, x0: number, x1: number, top: number, jag: number, step: number): string {
  let d = `M${n(x0)} ${H} L${n(x0)} ${n(top + r() * jag)}`
  for (let x = x0 + step; x < x1; x += step) {
    const y = top + r() * jag
    d += ` Q${n(x - step / 2)} ${n(y - jag * 0.35)} ${n(x)} ${n(y)}`
  }
  return `${d} L${n(x1)} ${n(top + r() * jag)} L${n(x1)} ${H} Z`
}

/* ------------------------------------------------------- 5. Vịnh sương sớm */

/** Một đảo đá vôi: thân dựng đứng, đỉnh tròn, chân nằm trên mặt nước `base`. */
function karst(x: number, base: number, w: number, h: number, lean: number): string {
  const t = base - h
  return (
    `M${n(x)} ${n(base)} C${n(x + w * 0.02)} ${n(base - h * 0.55)} ${n(x + w * 0.12 + lean)} ${n(t)} ${n(x + w * 0.4 + lean)} ${n(t)}` +
    ` C${n(x + w * 0.68 + lean)} ${n(t)} ${n(x + w * 0.82)} ${n(base - h * 0.75)} ${n(x + w * 0.86)} ${n(base - h * 0.45)}` +
    ` C${n(x + w * 0.9)} ${n(base - h * 0.2)} ${n(x + w)} ${n(base - h * 0.08)} ${n(x + w)} ${n(base)} Z`
  )
}

function drawMistBay() {
  const r = rng(55)
  const sea = 600
  const defs =
    '<linearGradient id="hl-sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#dbe5ea"/><stop offset=".55" stop-color="#ebf0ef"/><stop offset="1" stop-color="#f2f1ea"/></linearGradient>' +
    '<linearGradient id="hl-sea" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#e3eaea"/><stop offset="1" stop-color="#d5e0e2"/></linearGradient>' +
    '<radialGradient id="hl-sun"><stop offset="0" stop-color="#fff6dc" stop-opacity=".9"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="hl-mist"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
  const style =
    '.hl-m{animation:hl-drift linear infinite alternate}' +
    '@keyframes hl-drift{from{transform:translateX(-120px)}to{transform:translateX(120px)}}' +
    '.hl-boat{animation:hl-sail 220s ease-in-out infinite alternate}' +
    '@keyframes hl-sail{from{transform:translateX(0)}to{transform:translateX(300px)}}' +
    '.hl-sw{animation:hl-sw 9s ease-in-out infinite}' +
    '@keyframes hl-sw{0%,100%{transform:translateY(0)}50%{transform:translateY(1.5px)}}'

  // Ba lớp đảo: xa nhạt (gần màu trời), gần đậm hơn; lớp gần chỉ ở hai mép.
  const layers: { fill: string; xs: number[][] }[] = [
    { fill: '#cdd9dc', xs: [[60, 150, 210], [250, 120, 150], [1180, 140, 190], [1330, 170, 230], [1500, 110, 160]] },
    { fill: '#b3c5c9', xs: [[-30, 170, 300], [150, 130, 230], [1290, 160, 270], [1440, 190, 320]] },
    { fill: '#93abb0', xs: [[-60, 200, 380], [1420, 240, 400]] },
  ]
  let islands = ''
  let mirror = ''
  layers.forEach(({ fill, xs }, i) => {
    for (const [x = 0, w = 0, h = 0] of xs) {
      const base = sea + i * 6
      const d = karst(x, base, w, h, (r() - 0.5) * 30)
      islands += `<path d="${d}" fill="${fill}"/>`
      // Bóng dưới nước: lật quanh mặt nước, rất mờ.
      mirror += `<path d="${d}" fill="${fill}" transform="translate(0 ${n(base * 2)}) scale(1 -1)"/>`
    }
  })
  // Dải đảo thấp, rất nhạt ở chân trời giữa: có chiều sâu mà không cắt ngang vùng chữ.
  const horizon = ridge(r, 380, 1220, sea - 26, 18, 70)

  let mists = ''
  const rows: [number, number, number][] = [
    [sea - 40, 620, 0.75],
    [sea + 10, 560, 0.6],
    [sea - 160, 520, 0.45],
    [sea + 120, 700, 0.5],
  ]
  rows.forEach(([y, rx, op], i) => {
    const dur = 70 + i * 23
    mists += `<g class="hl-m" style="animation-duration:${dur}s;animation-delay:${n(-r() * dur)}s">${mist('hl-mist', 300 + r() * 1000, y, rx, 46 + r() * 20, op)}</g>`
  })

  const boat =
    `<g class="hl-boat"><g class="hl-sw" fill="#6f8589">` +
    `<path d="M1150 ${sea - 2} l46 0 l-6 7 l-34 0 Z"/>` +
    `<path d="M1162 ${sea - 4} l0 -30 l14 6 l-2 24 Z"/><path d="M1179 ${sea - 4} l0 -24 l11 5 l-2 19 Z"/>` +
    '</g></g>'

  const body =
    `<rect width="${W}" height="${H}" fill="url(#hl-sky)"/>` +
    '<circle cx="1210" cy="190" r="190" fill="url(#hl-sun)"/>' +
    `<path d="${horizon}" fill="#d7e1e2" opacity=".8"/>` +
    `<rect y="${sea}" width="${W}" height="${H - sea}" fill="url(#hl-sea)"/>` +
    `<g opacity=".22">${mirror}</g>` +
    islands +
    boat +
    mists

  return { defs, style, body }
}

/* ------------------------------------------------------------- 6. Đầm sen */

/** Lá sen nổi: hình tròn khuyết một góc, nhìn nghiêng nên dẹt theo chiều dọc. */
function lotusLeaf(cx: number, cy: number, rad: number, notch: number, fill: string, vein: string): string {
  const a1 = notch + 0.13
  const a2 = notch - 0.13
  const p = (a: number) => `${n(Math.cos(a) * rad)} ${n(Math.sin(a) * rad)}`
  let veins = ''
  for (let i = 1; i < 9; i++) {
    const a = notch + (i / 9) * Math.PI * 2
    veins += `<line x1="0" y1="0" x2="${n(Math.cos(a) * rad * 0.9)}" y2="${n(Math.sin(a) * rad * 0.9)}"/>`
  }
  return (
    `<g transform="translate(${n(cx)} ${n(cy)}) scale(1 .58)">` +
    `<path d="M0 0 L${p(a1)} A${n(rad)} ${n(rad)} 0 1 1 ${p(a2)} Z" fill="${fill}"/>` +
    `<g stroke="${vein}" stroke-width="2" opacity=".55">${veins}</g></g>`
  )
}

/** Hoa sen: năm cánh quanh gốc (x, y), có cuống thả xuống mặt nước. */
function lotusFlower(x: number, y: number, s: number, stem: number, sway: string): string {
  const petals = [-58, 58, -30, 30, 0]
    .map(
      a =>
        `<ellipse cx="0" cy="${n(-26 * s)}" rx="${n(11 * s)}" ry="${n(28 * s)}" transform="rotate(${a})" fill="url(#ds-petal)"/>`,
    )
    .join('')
  return (
    `<g class="ds-sway" style="transform-origin:${n(x)}px ${n(y + stem)}px;${sway}">` +
    `<path d="M${n(x)} ${n(y + stem)} q${n(-6 * s)} ${n(-stem / 2)} 0 ${n(-stem)}" stroke="#7f9d74" stroke-width="${n(3 * s)}" fill="none"/>` +
    `<g transform="translate(${n(x)} ${n(y)})">${petals}<circle cy="${n(-8 * s)}" r="${n(6 * s)}" fill="#e8cf86"/></g></g>`
  )
}

function drawLotusPond() {
  const r = rng(66)
  const defs =
    '<linearGradient id="ds-bg" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#eef3e8"/><stop offset=".5" stop-color="#f4f4ea"/><stop offset="1" stop-color="#e7eee2"/></linearGradient>' +
    '<linearGradient id="ds-petal" x1="0" y1="1" x2="0" y2="0">' +
    '<stop offset="0" stop-color="#f6dde2"/><stop offset="1" stop-color="#e3a0b2"/></linearGradient>'
  const style =
    '.ds-sway{animation:ds-sway 16s ease-in-out infinite}' +
    '@keyframes ds-sway{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}}' +
    '.ds-rip{transform-box:fill-box;transform-origin:center;animation:ds-rip 14s ease-out infinite}' +
    '@keyframes ds-rip{0%{transform:scale(.2);opacity:0}15%{opacity:.5}100%{transform:scale(1.6);opacity:0}}' +
    '.ds-bob{animation:ds-bob 18s ease-in-out infinite}' +
    '@keyframes ds-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}'

  const greens = ['#b7cca8', '#a7c19a', '#c3d4b5', '#9fba92']
  // Lá chỉ ở bốn góc; giữa màn hình để trống.
  const spots: [number, number, number][] = [
    [80, 90, 150], [270, 40, 110], [40, 300, 95], [1530, 110, 140], [1340, 50, 100], [1560, 330, 90],
    [120, 820, 160], [330, 880, 120], [1480, 830, 170], [1270, 890, 110],
  ]
  let leaves = ''
  spots.forEach(([x, y, rad], i) => {
    const leaf = lotusLeaf(x, y, rad, r() * Math.PI * 2, pick(r, greens), '#dbe6cf')
    leaves += `<g class="ds-bob" style="animation-delay:${n(-i * 2.3)}s">${leaf}</g>`
  })

  const flowers =
    lotusFlower(250, 210, 1.15, 90, 'animation-delay:-3s') +
    lotusFlower(1390, 230, 1, 80, 'animation-delay:-9s') +
    lotusFlower(1440, 700, 1.2, 70, 'animation-delay:-5s') +
    `<g opacity=".85">${lotusFlower(180, 690, 0.8, 60, 'animation-delay:-12s')}</g>`

  let ripples = ''
  const rp: [number, number][] = [[420, 790], [1180, 160], [1230, 800]]
  rp.forEach(([x, y], i) => {
    for (let k = 0; k < 2; k++) {
      ripples += `<ellipse class="ds-rip" cx="${x}" cy="${y}" rx="70" ry="22" fill="none" stroke="#a9bfa0" stroke-width="1.6" style="animation-delay:${n(-(i * 4.6 + k * 7))}s"/>`
    }
  })

  const body = `<rect width="${W}" height="${H}" fill="url(#ds-bg)"/>` + ripples + leaves + flowers

  return { defs, style, body }
}

/* ---------------------------------------------------------- 7. Núi đêm Tây Bắc */

function drawMountainNight() {
  const r = rng(77)
  const defs =
    '<linearGradient id="nd-sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#0e1422"/><stop offset=".6" stop-color="#151e31"/><stop offset="1" stop-color="#1b253a"/></linearGradient>' +
    '<radialGradient id="nd-moon"><stop offset="0" stop-color="#efe7c8" stop-opacity=".35"/><stop offset="1" stop-color="#efe7c8" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="nd-mist"><stop offset="0" stop-color="#9fb0cc"/><stop offset="1" stop-color="#9fb0cc" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="nd-win"><stop offset="0" stop-color="#f3c47a"/><stop offset="1" stop-color="#f3c47a" stop-opacity="0"/></radialGradient>'
  const style =
    '.nd-tw{animation:nd-tw 12s ease-in-out infinite}' +
    '@keyframes nd-tw{0%,100%{opacity:.35}50%{opacity:.7}}' +
    '.nd-m{animation:nd-drift linear infinite alternate}' +
    '@keyframes nd-drift{from{transform:translateX(-140px)}to{transform:translateX(140px)}}' +
    '.nd-win{animation:nd-win 10s ease-in-out infinite}' +
    '@keyframes nd-win{0%,100%{opacity:.55}50%{opacity:.85}}'

  // Sao thưa, mờ, lấp lánh chậm; nằm ở dải trên cùng.
  let stars = ''
  for (let i = 0; i < 46; i++) {
    const x = r() * W
    const y = r() * 330
    stars += `<circle class="nd-tw" cx="${n(x)}" cy="${n(y)}" r="${n(0.6 + r() * 1.1)}" fill="#e6e9f2" style="animation-delay:${n(-r() * 12)}s"/>`
  }

  // Bốn lớp núi, gần thì tối hơn, chênh nhau rất ít với bầu trời.
  const ridges =
    `<path d="${ridge(r, 0, W, 520, 90, 120)}" fill="#1f2a40"/>` +
    `<path d="${ridge(r, 0, W, 610, 80, 150)}" fill="#1a2338"/>` +
    `<path d="${ridge(r, 0, W, 700, 70, 170)}" fill="#151d2f"/>` +
    `<path d="${ridge(r, 0, W, 790, 50, 200)}" fill="#111726"/>`

  let mists = ''
  const rows: [number, number][] = [[600, 0.1], [690, 0.08], [520, 0.06]]
  rows.forEach(([y, op], i) => {
    const dur = 110 + i * 30
    mists += `<g class="nd-m" style="animation-duration:${dur}s;animation-delay:${n(-r() * dur)}s">${mist('nd-mist', 200 + r() * 1200, y, 640, 38, op)}</g>`
  })

  // Vài ánh đèn nhà sàn ở sườn núi hai bên mép.
  const homes: [number, number][] = [[160, 668], [205, 676], [1395, 700], [1452, 690], [1488, 704]]
  let lights = ''
  homes.forEach(([x, y], i) => {
    lights += `<g class="nd-win" style="animation-delay:${n(-i * 2.1)}s"><circle cx="${x}" cy="${y}" r="14" fill="url(#nd-win)"/><rect x="${x - 2.5}" y="${y - 2}" width="5" height="4" fill="#f6d79b"/></g>`
  })

  const body =
    `<rect width="${W}" height="${H}" fill="url(#nd-sky)"/>` +
    stars +
    '<circle cx="270" cy="150" r="120" fill="url(#nd-moon)"/>' +
    '<path d="M282 112 a40 40 0 1 0 0 76 a32 32 0 1 1 0 -76 Z" fill="#ece4c4" opacity=".85"/>' +
    ridges +
    mists +
    lights

  return { defs, style, body }
}

/* --------------------------------------------------------------- 8. Hoa đăng */

/** Một đèn hoa đăng trôi: đế hoa sen nhỏ, lõi sáng ấm, quầng sáng và vệt phản chiếu. */
function floatLantern(x: number, y: number, s: number): string {
  const P = (dx: number, dy: number) => `${n(x + dx * s)} ${n(y + dy * s)}`
  return (
    `<circle cx="${n(x)}" cy="${n(y - 8 * s)}" r="${n(40 * s)}" fill="url(#hd-glow)"/>` +
    // Vệt phản chiếu dưới nước.
    `<rect x="${n(x - 4 * s)}" y="${n(y + 6 * s)}" width="${n(8 * s)}" height="${n(40 * s)}" rx="${n(4 * s)}" fill="url(#hd-ref)"/>` +
    `<ellipse cx="${n(x)}" cy="${n(y + 2 * s)}" rx="${n(18 * s)}" ry="${n(4.5 * s)}" fill="#7d4636"/>` +
    // Cánh sen: hai cánh bên, một cánh giữa; ngọn nến sáng bên trong.
    `<path d="M${P(-17, 0)} Q${P(-21, -16)} ${P(-7, -19)} Q${P(-4, -8)} ${P(-1, 0)} Z" fill="#e0805f"/>` +
    `<path d="M${P(17, 0)} Q${P(21, -16)} ${P(7, -19)} Q${P(4, -8)} ${P(1, 0)} Z" fill="#e0805f"/>` +
    `<path d="M${P(-8, 0)} Q${P(0, -30)} ${P(8, 0)} Z" fill="#f4ad74"/>` +
    `<circle cx="${n(x)}" cy="${n(y - 7 * s)}" r="${n(3 * s)}" fill="#fff0c8"/>`
  )
}

function drawLanternRiver() {
  const r = rng(88)
  const water = 610
  const defs =
    '<linearGradient id="hd-sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#110f1c"/><stop offset="1" stop-color="#1b1727"/></linearGradient>' +
    '<linearGradient id="hd-river" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#171422"/><stop offset="1" stop-color="#0e0c16"/></linearGradient>' +
    '<radialGradient id="hd-glow"><stop offset="0" stop-color="#ffbf66" stop-opacity=".42"/><stop offset="1" stop-color="#ffbf66" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="hd-ref" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2b45e" stop-opacity=".35"/><stop offset="1" stop-color="#f2b45e" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="hd-win"><stop offset="0" stop-color="#e9b26a" stop-opacity=".7"/><stop offset="1" stop-color="#e9b26a" stop-opacity="0"/></radialGradient>'
  const style =
    '.hd-go{animation:hd-go linear infinite}' +
    `@keyframes hd-go{from{transform:translateX(-120px)}to{transform:translateX(${W + 120}px)}}` +
    '.hd-bob{animation:hd-bob 7s ease-in-out infinite}' +
    '@keyframes hd-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}' +
    '.hd-tw{animation:hd-tw 14s ease-in-out infinite}' +
    '@keyframes hd-tw{0%,100%{opacity:.3}50%{opacity:.6}}'

  let stars = ''
  for (let i = 0; i < 30; i++) {
    stars += `<circle class="hd-tw" cx="${n(r() * W)}" cy="${n(r() * 260)}" r="${n(0.6 + r())}" fill="#efe6dc" style="animation-delay:${n(-r() * 14)}s"/>`
  }

  // Bờ bên kia: mái nhà thấp, chỉ cao ở hai mép; vài ô cửa sáng mờ.
  const roofs = (x0: number, x1: number, hi: number) => {
    let d = `M${x0} ${water}`
    for (let x = x0; x < x1; x += 70 + r() * 40) {
      const w = 60 + r() * 40
      const h = hi * (0.6 + r() * 0.4)
      d += ` L${n(x)} ${n(water - h)} L${n(x + w * 0.15)} ${n(water - h - 16)} L${n(x + w * 0.85)} ${n(water - h - 16)} L${n(x + w)} ${n(water - h)}`
    }
    return `${d} L${x1} ${water} Z`
  }
  let windows = ''
  const wins: [number, number][] = [[90, 560], [175, 548], [300, 566], [1300, 562], [1410, 548], [1520, 560]]
  for (const [x, y] of wins) windows += `<circle cx="${x}" cy="${y}" r="16" fill="url(#hd-win)"/><rect x="${x - 4}" y="${y - 4}" width="8" height="7" fill="#d9a35e" opacity=".8"/>`

  // Cầu vòm thấp bên trái: mặt cầu cong, ba nhịp vòm, bóng mờ dưới nước.
  const w0 = water
  const bridgeD =
    `M0 ${w0} L0 ${w0 - 44} Q210 ${w0 - 112} 420 ${w0 - 44} L420 ${w0}` +
    ` L392 ${w0} Q341 ${w0 - 42} 290 ${w0} L272 ${w0} Q210 ${w0 - 72} 148 ${w0} L130 ${w0} Q79 ${w0 - 42} 28 ${w0} Z`
  const bridge =
    `<path d="${bridgeD}" fill="#251f35"/>` +
    `<path d="M0 ${w0 - 44} Q210 ${w0 - 112} 420 ${w0 - 44}" fill="none" stroke="#3a3048" stroke-width="3"/>` +
    `<path d="${bridgeD}" fill="#251f35" opacity=".35" transform="translate(0 ${w0 * 2}) scale(1 -1)"/>`

  // Đèn trôi chậm sang phải; mỗi chiếc một làn và một tốc độ.
  let lanterns = ''
  for (let i = 0; i < 8; i++) {
    const y = water + 60 + (i % 4) * 55 + r() * 20
    const s = 0.8 + ((y - water) / 300) * 0.5
    const dur = 160 + r() * 90
    lanterns += `<g class="hd-go" style="animation-duration:${n(dur)}s;animation-delay:${n(-r() * dur)}s"><g class="hd-bob" style="animation-delay:${n(-r() * 7)}s">${floatLantern(0, y, s)}</g></g>`
  }

  const body =
    `<rect width="${W}" height="${H}" fill="url(#hd-sky)"/>` +
    stars +
    `<path d="${roofs(0, 430, 70)}" fill="#221d30"/>` +
    `<path d="${roofs(1180, W, 75)}" fill="#221d30"/>` +
    `<rect y="${water - 6}" width="${W}" height="6" fill="#221d30"/>` +
    windows +
    `<rect y="${water}" width="${W}" height="${H - water}" fill="url(#hd-river)"/>` +
    bridge +
    lanterns

  return { defs, style, body }
}

/* ----------------------------------------------------- 9–10. Kính lỏng */

type Pt = [number, number]

/** Điểm và pháp tuyến trên đường cong bậc ba P0..P3 tại t. */
function cubicAt(p: readonly Pt[], t: number): { x: number; y: number; nx: number; ny: number } {
  const [a, b, c, d] = p as [Pt, Pt, Pt, Pt]
  const u = 1 - t
  const x = u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0]
  const y = u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]
  const dx = 3 * u * u * (b[0] - a[0]) + 6 * u * t * (c[0] - b[0]) + 3 * t * t * (d[0] - c[0])
  const dy = 3 * u * u * (b[1] - a[1]) + 6 * u * t * (c[1] - b[1]) + 3 * t * t * (d[1] - c[1])
  const len = Math.hypot(dx, dy) || 1
  return { x, y, nx: -dy / len, ny: dx / len }
}

/**
 * Một dải kính cong, thon hai đầu: thân mờ trong, viền sáng một bên, viền tối bên kia,
 * thêm một vệt cầu vồng chạy dọc thân như ánh sáng bị khúc xạ.
 */
function glassRibbon(p: string, pts: readonly Pt[], width: number, dark: boolean): string {
  const N = 90
  const left: string[] = []
  const right: string[] = []
  const mid: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const { x, y, nx, ny } = cubicAt(pts, t)
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * t), 0.55)
    left.push(`${n(x + nx * w)} ${n(y + ny * w)}`)
    right.push(`${n(x - nx * w)} ${n(y - ny * w)}`)
    mid.push(`${n(x + nx * w * 0.45)} ${n(y + ny * w * 0.45)}`)
  }
  const line = (a: string[]) => `M${a.join(' L')}`
  const shape = `${line(left)} L${[...right].reverse().join(' L')} Z`
  const hi = dark ? 0.55 : 0.95
  const lo = dark ? 0.4 : 0.35
  return (
    // Bóng đổ rất nhẹ cho dải kính có chiều sâu.
    `<path d="${shape}" fill="${dark ? '#000814' : '#5a6a96'}" opacity="${dark ? 0.28 : 0.07}" transform="translate(0 22)"/>` +
    // Lớp màu cầu vồng mờ trong thân: giả ánh sáng phía sau bị bẻ cong qua kính.
    `<path d="${shape}" fill="url(#${p}-iri)" opacity="${dark ? 0.12 : 0.22}"/>` +
    `<path d="${shape}" fill="url(#${p}-body)"/>` +
    `<path d="${line(left)}" fill="none" stroke="#ffffff" stroke-opacity="${hi}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="${line(right)}" fill="none" stroke="${dark ? '#8fa6ff' : '#7d8fbf'}" stroke-opacity="${lo}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="${line(mid)}" fill="none" stroke="url(#${p}-iri)" stroke-opacity="${dark ? 0.45 : 0.6}" stroke-width="3" stroke-linecap="round"/>`
  )
}

/** Một giọt kính tròn: lòng gần như trong suốt, mép dày sáng, đốm phản quang, vệt hội tụ đáy. */
function glassOrb(p: string, cx: number, cy: number, r: number, dark: boolean): string {
  const arc = (r0: number, a0: number, a1: number) => {
    const P = (a: number) => `${n(cx + Math.cos(a) * r0)} ${n(cy + Math.sin(a) * r0)}`
    return `M${P(a0)} A${n(r0)} ${n(r0)} 0 0 1 ${P(a1)}`
  }
  return (
    `<ellipse cx="${n(cx + r * 0.08)}" cy="${n(cy + r * 1.05)}" rx="${n(r * 0.8)}" ry="${n(r * 0.12)}" fill="${dark ? '#000814' : '#5a6a96'}" opacity="${dark ? 0.3 : 0.08}"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="url(#${p}-orb)"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r - 1)}" fill="none" stroke="url(#${p}-iri)" stroke-opacity="${dark ? 0.55 : 0.7}" stroke-width="2"/>` +
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.93)}" fill="none" stroke="#ffffff" stroke-opacity="${dark ? 0.18 : 0.45}" stroke-width="1.2"/>` +
    `<ellipse cx="${n(cx - r * 0.36)}" cy="${n(cy - r * 0.46)}" rx="${n(r * 0.36)}" ry="${n(r * 0.15)}" transform="rotate(-32 ${n(cx - r * 0.36)} ${n(cy - r * 0.46)})" fill="url(#${p}-spec)" class="${p}-sh"/>` +
    `<path d="${arc(r * 0.8, 0.35, 1.45)}" fill="none" stroke="#ffffff" stroke-opacity="${dark ? 0.35 : 0.7}" stroke-width="${n(r * 0.05)}" stroke-linecap="round"/>`
  )
}

/**
 * Kính lỏng: nền loang màu pastel rất mịn ở giữa (vùng chữ), dải kính cong và giọt kính
 * ở các góc. Mọi chuyển động chỉ dùng transform/opacity, chu kỳ dài.
 */
function drawLiquidGlass(dark: boolean) {
  const p = dark ? 'lgd' : 'lg'
  const base = dark ? ['#0c1020', '#121730', '#0e1426'] : ['#e8eef9', '#f0edf8', '#eaf2f5']
  // Năm vệt màu loang: [x, y, bán kính, màu, độ đậm].
  const blobs: [number, number, number, string, number][] = dark
    ? [
        [140, 80, 620, '#2b3f9e', 0.55],
        [1500, 160, 560, '#5b2f93', 0.5],
        [1480, 860, 600, '#155e72', 0.5],
        [120, 880, 560, '#7a2a6c', 0.42],
        [800, 450, 700, '#1e2a5a', 0.2],
      ]
    : [
        [140, 80, 620, '#a9c8f5', 0.75],
        [1500, 160, 560, '#cdbcf2', 0.7],
        [1480, 860, 600, '#b8e4dc', 0.65],
        [120, 880, 560, '#f5c6da', 0.6],
        [800, 450, 700, '#f7e3d2', 0.35],
      ]

  let defs =
    `<linearGradient id="${p}-base" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${base[0]}"/><stop offset=".5" stop-color="${base[1]}"/><stop offset="1" stop-color="${base[2]}"/></linearGradient>` +
    `<linearGradient id="${p}-body" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="${dark ? 0.11 : 0.62}"/>` +
    `<stop offset=".5" stop-color="#ffffff" stop-opacity="${dark ? 0.04 : 0.16}"/>` +
    `<stop offset="1" stop-color="#ffffff" stop-opacity="${dark ? 0.08 : 0.48}"/></linearGradient>` +
    `<linearGradient id="${p}-iri" x1="0" y1="0" x2="1" y2="1">` +
    '<stop offset="0" stop-color="#ff9ecb"/><stop offset=".35" stop-color="#9fc2ff"/>' +
    '<stop offset=".7" stop-color="#9ff0d6"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient>' +
    `<radialGradient id="${p}-orb" cx=".42" cy=".38" r=".62">` +
    `<stop offset="0" stop-color="#ffffff" stop-opacity="${dark ? 0.02 : 0.05}"/>` +
    `<stop offset=".72" stop-color="#ffffff" stop-opacity="${dark ? 0.05 : 0.14}"/>` +
    `<stop offset=".93" stop-color="#ffffff" stop-opacity="${dark ? 0.2 : 0.45}"/>` +
    `<stop offset="1" stop-color="#ffffff" stop-opacity="${dark ? 0.32 : 0.7}"/></radialGradient>` +
    `<radialGradient id="${p}-spec"><stop offset="0" stop-color="#ffffff" stop-opacity="${dark ? 0.6 : 0.95}"/>` +
    '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>'
  blobs.forEach(([, , , c, o], i) => {
    defs +=
      `<radialGradient id="${p}-b${i}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/>` +
      `<stop offset=".55" stop-color="${c}" stop-opacity="${n(o * 0.45)}"/>` +
      `<stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`
  })

  const style =
    `.${p}-dr{animation:${p}-dr ease-in-out infinite alternate}` +
    `@keyframes ${p}-dr{from{transform:translate(-50px,-30px)}to{transform:translate(50px,30px)}}` +
    `.${p}-sw{transform-box:fill-box;transform-origin:center;animation:${p}-sw ease-in-out infinite alternate}` +
    `@keyframes ${p}-sw{from{transform:rotate(-1.6deg) translate(-10px,0)}to{transform:rotate(1.6deg) translate(10px,6px)}}` +
    `.${p}-fl{animation:${p}-fl ease-in-out infinite alternate}` +
    `@keyframes ${p}-fl{from{transform:translateY(-12px)}to{transform:translateY(12px)}}` +
    `.${p}-sh{animation:${p}-sh 16s ease-in-out infinite}` +
    `@keyframes ${p}-sh{0%,100%{opacity:.75}50%{opacity:1}}`

  let glow = ''
  blobs.forEach(([x, y, r], i) => {
    const dur = 70 + i * 13
    glow += `<g class="${p}-dr" style="animation-duration:${dur}s;animation-delay:${-i * 17}s"><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${p}-b${i})"/></g>`
  })

  // Dải kính: một dải lớn quét qua góc trên phải, một dải ôm góc dưới trái, một dải mảnh trên trái.
  const ribbons: [readonly Pt[], number, number][] = [
    [[[930, -80], [1180, 170], [1420, 40], [1700, 420]], 230, 46],
    [[[-120, 470], [180, 560], [260, 820], [560, 990]], 240, 54],
    [[[-80, 150], [120, 60], [260, 240], [430, -60]], 110, 40],
    [[[1240, 1000], [1360, 780], [1560, 820], [1700, 640]], 140, 50],
  ]
  let glass = ''
  ribbons.forEach(([pts, w, dur], i) => {
    glass += `<g class="${p}-sw" style="animation-duration:${dur}s;animation-delay:${-i * 9}s">${glassRibbon(p, pts, w, dark)}</g>`
  })

  const orbs: [number, number, number, number][] = [
    [1330, 250, 92, 24],
    [250, 700, 64, 28],
    [1500, 690, 46, 21],
    [420, 120, 34, 26],
  ]
  orbs.forEach(([x, y, r, dur], i) => {
    glass += `<g class="${p}-fl" style="animation-duration:${dur}s;animation-delay:${-i * 6}s">${glassOrb(p, x, y, r, dark)}</g>`
  })

  const body = `<rect width="${W}" height="${H}" fill="url(#${p}-base)"/>` + glow + glass

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
  {
    id: 'vinh-suong',
    name: 'Vịnh sương sớm',
    desc: 'Đảo đá vôi trong sương, thuyền buồm trôi xa',
    alias: ['vinh', 'suong', 'ha long', 'halong', 'bay', 'mist'],
    mode: 'light',
    glass: { blur: 18, tint: '#f1f4f3', opacity: 0.7 },
    palette: {
      roles: { accent: '#2c6a7a', danger: '#b23a35', success: '#3f7f4a', warning: '#9a6a12', pro: '#6a5596' },
      anchors: {
        'surface-0': '#e4eaea',
        'surface-1': '#ecf1f0',
        'surface-2': '#f5f8f7',
        'surface-3': '#f5f8f7',
        'text-primary': '#17242a',
        'text-secondary': '#33454b',
        'text-muted': '#4e6167',
      },
    },
    draw: drawMistBay,
  },
  {
    id: 'dam-sen',
    name: 'Đầm sen',
    desc: 'Lá sen nổi, hoa sen khẽ đung đưa, gợn nước',
    alias: ['sen', 'dam', 'ho sen', 'lotus'],
    mode: 'light',
    glass: { blur: 16, tint: '#f3f6ee', opacity: 0.68 },
    palette: {
      roles: { accent: '#a64a6a', danger: '#b23a2e', success: '#3f7d3c', warning: '#966914', pro: '#6a4f96' },
      anchors: {
        'surface-0': '#e8eee1',
        'surface-1': '#eff4e9',
        'surface-2': '#f7f9f3',
        'surface-3': '#f7f9f3',
        'text-primary': '#1c291b',
        'text-secondary': '#374935',
        'text-muted': '#52644f',
      },
    },
    draw: drawLotusPond,
  },
  {
    id: 'nui-dem',
    name: 'Núi đêm',
    desc: 'Núi Tây Bắc chồng lớp, sương trôi, đèn nhà sàn',
    alias: ['nui', 'tay bac', 'mountain'],
    mode: 'dark',
    glass: { blur: 18, tint: '#111725', opacity: 0.66 },
    palette: {
      roles: { accent: '#7fa8e0', danger: '#ef6b5e', success: '#7cc48a', warning: '#e9b955', pro: '#b59cf0' },
      anchors: {
        'surface-0': '#10151f',
        'surface-1': '#161c28',
        'surface-2': '#1b2230',
        'surface-3': '#1f2735',
        'text-primary': '#eef1f6',
        'text-secondary': '#c9cfdb',
        'text-muted': '#a3abba',
      },
    },
    draw: drawMountainNight,
  },
  {
    id: 'hoa-dang',
    name: 'Hoa đăng',
    desc: 'Đèn hoa đăng trôi chậm trên sông đêm',
    alias: ['hoa dang', 'dang', 'song', 'river'],
    mode: 'dark',
    glass: { blur: 18, tint: '#15111f', opacity: 0.66 },
    palette: {
      roles: { accent: '#f0a54a', danger: '#ef6a5a', success: '#86c48c', warning: '#f1c45a', pro: '#c3a0f0' },
      anchors: {
        'surface-0': '#141120',
        'surface-1': '#1b1729',
        'surface-2': '#211c31',
        'surface-3': '#251f36',
        'text-primary': '#f5eee6',
        'text-secondary': '#d8ccc4',
        'text-muted': '#b3a7a4',
      },
    },
    draw: drawLanternRiver,
  },
  {
    id: 'kinh-long',
    name: 'Kính lỏng',
    desc: 'Nền pastel loang, dải kính cong và giọt kính khúc xạ',
    alias: ['kinh', 'kinh long', 'glass', 'liquid glass', 'liquid'],
    mode: 'light',
    // Kính trong hơn các cảnh khác (opacity thấp, blur cao): nền giữa đủ mịn để chữ vẫn rõ.
    glass: { blur: 34, tint: '#f7f9fd', opacity: 0.46 },
    palette: {
      roles: { accent: '#2f6ad0', danger: '#c03a4c', success: '#2e8458', warning: '#a26d10', pro: '#7a52c4' },
      anchors: {
        'surface-0': '#eaeef7',
        'surface-1': '#f1f4fa',
        'surface-2': '#f8f9fd',
        'surface-3': '#f8f9fd',
        'text-primary': '#141a2b',
        'text-secondary': '#323d58',
        'text-muted': '#4d5872',
      },
    },
    draw: () => drawLiquidGlass(false),
  },
  {
    id: 'kinh-long-dem',
    name: 'Kính lỏng đêm',
    desc: 'Kính lỏng trên nền đêm xanh tím',
    alias: ['kinh dem', 'kinh long dem', 'glass dark', 'liquid dark'],
    mode: 'dark',
    glass: { blur: 34, tint: '#121829', opacity: 0.52 },
    palette: {
      roles: { accent: '#82b0ff', danger: '#ff7a86', success: '#72cf9e', warning: '#eec05e', pro: '#c3a3ff' },
      anchors: {
        'surface-0': '#0f1322',
        'surface-1': '#151a2b',
        'surface-2': '#1a2033',
        'surface-3': '#1e2438',
        'text-primary': '#eef1fa',
        'text-secondary': '#c8cee0',
        'text-muted': '#a2abc2',
      },
    },
    draw: () => drawLiquidGlass(true),
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
