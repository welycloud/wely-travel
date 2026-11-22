/**
 * Lo que muestran las pantallas de la oficina, dibujado en pixel-art (1 px de arte = 3 px de imagen).
 *
 * - Torre de control (Francisco, 6 monitores): ruta con el avión, tablero de salidas, radar,
 *   comparador de precio por aerolínea, tendencia de precio de la ruta y clima del destino.
 * - Agente Copa (2 monitores): consola de búsqueda y la conexión vía Panamá.
 *
 * Cada pantalla es un cuadrilátero (los monitores laterales están en perspectiva); el contenido se
 * dibuja en un canvas chico y se proyecta con una transformación afín. Más rápido cuando el módulo trabaja.
 */
const PX = 3
// [x, yArribaIzq, ancho, alto, desnivel]
const MARINE = [
  { id: 'ruta', q: [1981, 337, 125, 88, -25] },
  { id: 'salidas', q: [2135, 307, 155, 91, 0] },
  { id: 'radar', q: [2318, 312, 122, 90, 18] },
  { id: 'barras', q: [1981, 455, 125, 85, -23] },
  { id: 'historial', q: [2135, 425, 155, 89, 0] },
  { id: 'clima', q: [2318, 430, 122, 92, 20] },
]
const COPA = [
  { id: 'codigo', q: [470, 422, 154, 112, 0] },
  { id: 'conexion', q: [652, 414, 166, 98, 0] },
]
const NOMBRES = ['LATAM', 'SKY', 'JetSMART', 'Copa', 'Iberia']
const COLOR_AERO = { LATAM: '#ff6b9a', SKY: '#7fd1ff', JetSMART: '#ffd166', Copa: '#4cc9f0', Iberia: '#ff8c42' }
const DESTINOS_DEMO = ['MAD', 'LIM', 'CUN', 'MIA', 'AEP', 'GRU', 'PUJ', 'LIS', 'BOG', 'JFK']

const lienzos = {}
function lienzo(id, w, h) {
  let c = lienzos[id]
  if (!c) { c = document.createElement('canvas'); c.width = w; c.height = h; lienzos[id] = c }
  return c
}
const rnd = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1
const hh = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`

// ------------------------------------------------------------------ escenas (coordenadas en px de arte)
function ruta(g, w, h, t, rapido, d) {
  g.fillStyle = '#0a2a44'; g.fillRect(0, 0, w, h)
  // continentes esquemáticos
  g.fillStyle = '#1f5c4a'
  for (const [x, y, rw, rh] of [[6, 4, 10, 8], [10, 12, 6, 14], [24, 3, 9, 6], [26, 9, 6, 9], [34, 5, 6, 5]]) g.fillRect(x, y, rw, rh)
  const ox = 12, oy = 22, dx = d.destX, dy = d.destY
  const k = rapido ? (t * 0.35) % 1 : (t * 0.08) % 1
  for (let i = 0; i <= 20; i++) {
    const u = i / 20, x = ox + (dx - ox) * u, y = oy + (dy - oy) * u - Math.sin(u * Math.PI) * 8
    if (i % 2 === 0) { g.fillStyle = '#9fe8ff'; g.fillRect(Math.round(x), Math.round(y), 1, 1) }
  }
  const x = ox + (dx - ox) * k, y = oy + (dy - oy) * k - Math.sin(k * Math.PI) * 8
  g.fillStyle = '#ffffff'; g.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); g.fillRect(Math.round(x), Math.round(y) - 1, 1, 3)
  g.fillStyle = '#ff4fa3'; g.fillRect(ox - 1, oy - 1, 3, 3); g.fillStyle = '#39ff14'; g.fillRect(dx - 1, dy - 1, 3, 3)
  g.fillStyle = '#d8f6ff'; g.font = '5px monospace'; g.fillText(`${d.origen}>${d.destino}`, 2, 6)
}

function salidas(g, w, h, t, rapido, d) {
  g.fillStyle = '#111317'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#ffcc33'; g.font = '5px monospace'; g.fillText('SALIDAS', 2, 6)
  const fila = Math.floor(t * (rapido ? 1.5 : 0.3))
  for (let i = 0; i < 4; i++) {
    const k = fila + i, y = 13 + i * 7
    const aero = NOMBRES[k % NOMBRES.length]
    g.fillStyle = '#ffe9a8'; g.fillText(`${aero.slice(0, 2).toUpperCase()}${100 + Math.floor(rnd(k) * 900)}`, 2, y)
    g.fillText(DESTINOS_DEMO[(k * 3) % DESTINOS_DEMO.length], 22, y)
    g.fillText(hh(300 + Math.floor(rnd(k + 9) * 1080)), 33, y)
    const ok = rnd(k + 4) > 0.2
    g.fillStyle = ok ? '#39ff14' : '#ff5a5a'; g.fillRect(w - 4, y - 3, 2, 2)
  }
}

function radar(g, w, h, t, rapido) {
  g.fillStyle = '#04200f'; g.fillRect(0, 0, w, h)
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 2
  g.strokeStyle = '#0d5a2a'; g.lineWidth = 1
  for (const k of [1, 0.66, 0.33]) { g.beginPath(); g.arc(cx, cy, r * k, 0, 6.29); g.stroke() }
  const a = t * (rapido ? 2.4 : 1.1)
  for (let i = 0; i < 16; i++) {
    const aa = a - i * 0.06
    g.strokeStyle = `rgba(57,255,20,${0.5 - i * 0.03})`
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r); g.stroke()
  }
  for (let i = 0; i < 8; i++) {
    const ba = rnd(i + 10) * 6.28 + t * 0.03 * (i % 2 ? 1 : -1), br = (0.25 + rnd(i + 11) * 0.7) * r
    const dd = ((a - ba) % 6.28 + 6.28) % 6.28
    g.fillStyle = `rgba(200,255,180,${0.25 + Math.max(0, 1 - dd / 3) * 0.75})`
    const x = cx + Math.cos(ba) * br, y = cy + Math.sin(ba) * br
    g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3)
  }
}

function barras(g, w, h, t, rapido, d) {
  g.fillStyle = '#0d1b2a'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#bde6ff'; g.font = '5px monospace'; g.fillText('PRECIO MIN', 2, 6)
  const vals = d.comparador
  const max = Math.max(1, ...vals.map((v) => v.min || 0))
  vals.forEach((v, i) => {
    const y = 10 + i * 5
    g.fillStyle = '#25384a'; g.fillRect(14, y, w - 17, 3)
    const largo = v.min ? ((v.min / max) * (w - 17)) * (rapido ? 0.6 + 0.4 * Math.abs(Math.sin(t * 2 + i)) : 1) : 0
    g.fillStyle = COLOR_AERO[v.nombre] || '#9fd3ea'; g.fillRect(14, y, largo, 3)
    g.fillStyle = '#9fb6c8'; g.fillText(v.nombre.slice(0, 3), 1, y + 3)
  })
}

function historial(g, w, h, t, rapido, d) {
  g.fillStyle = '#10202c'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#9fd3ea'; g.font = '5px monospace'; g.fillText('PRECIO DE LA RUTA', 2, 6)
  const s = d.semanas
  const mn = Math.min(...s), mx = Math.max(...s)
  const fin = rapido ? Math.floor((t * 3) % s.length) + 1 : s.length
  for (let i = 0; i < fin - 1; i++) {
    const x1 = 3 + (i / (s.length - 1)) * (w - 6), x2 = 3 + ((i + 1) / (s.length - 1)) * (w - 6)
    const y1 = h - 4 - ((s[i] - mn) / (mx - mn || 1)) * (h - 14), y2 = h - 4 - ((s[i + 1] - mn) / (mx - mn || 1)) * (h - 14)
    g.strokeStyle = '#ffd166'; g.lineWidth = 1; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke()
  }
  g.fillStyle = d.tendencia === 'subiendo' ? '#ff5a5a' : d.tendencia === 'bajando' ? '#39ff14' : '#9fd3ea'
  g.fillText(d.tendencia.toUpperCase(), w - 26, 6)
}

function clima(g, w, h, t, rapido, d) {
  const calor = d.temp >= 22
  g.fillStyle = calor ? '#3a8fd9' : '#56708a'; g.fillRect(0, 0, w, h)
  if (calor) {
    g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(12, 12, 5, 0, 6.29); g.fill()
    for (let i = 0; i < 8; i++) { const a = i * 0.785 + t * 0.5; g.fillRect(12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8, 1, 1) }
  } else {
    g.fillStyle = '#e8eef4'
    const x = 6 + Math.sin(t * 0.6) * 2
    g.fillRect(x, 10, 14, 5); g.fillRect(x + 3, 7, 8, 4)
  }
  g.fillStyle = '#ffffff'; g.font = '9px monospace'; g.fillText(`${d.temp}°`, w - 18, h - 8)
  g.font = '5px monospace'; g.fillText(d.ciudad.slice(0, 10).toUpperCase(), 2, h - 3)
}

function conexion(g, w, h, t, rapido, d) {
  g.fillStyle = '#0a2238'; g.fillRect(0, 0, w, h)
  const pts = [[8, h - 6, 'SCL'], [w / 2, h / 2, 'PTY'], [w - 8, 8, d.destino]]
  g.strokeStyle = '#2d6a8f'; g.lineWidth = 1
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.lineTo(pts[2][0], pts[2][1]); g.stroke()
  const k = (t * (rapido ? 0.5 : 0.12)) % 1
  const [a, b] = k < 0.5 ? [pts[0], pts[1]] : [pts[1], pts[2]]
  const u = (k % 0.5) * 2
  g.fillStyle = '#ffffff'; g.fillRect(a[0] + (b[0] - a[0]) * u - 1, a[1] + (b[1] - a[1]) * u - 1, 3, 3)
  g.font = '5px monospace'
  for (const [x, y, n] of pts) { g.fillStyle = '#4cc9f0'; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = '#cfefff'; g.fillText(n, Math.min(x + 2, w - 16), y + (y < 12 ? 6 : -2)) }
}

function codigo(g, w, h, t, rapido) {
  g.fillStyle = '#152029'; g.fillRect(0, 0, w, h)
  const v = rapido ? 7 : 1.2
  const desp = (t * v) % 4, base = Math.floor(t * v / 4)
  const cols = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff', '#e6edf3']
  for (let i = -1; i < h / 4 + 1; i++) {
    const n = base + i
    const sang = (Math.floor(rnd(n) * 4)) * 3
    let x = 3 + sang
    const y = h - 3 - (i * 4 + desp)
    const partes = 1 + Math.floor(rnd(n + 1) * 3)
    for (let k = 0; k < partes; k++) {
      const l = 3 + Math.floor(rnd(n * 3 + k) * 9)
      g.fillStyle = cols[(n + k) % cols.length]; g.fillRect(x, y, l, 1)
      x += l + 2
    }
  }
  if (Math.sin(t * 6) > 0) { g.fillStyle = '#e6edf3'; g.fillRect(4, h - 4, 2, 2) }
}

const ESCENAS = { ruta, salidas, radar, barras, historial, clima, codigo, conexion }

function proyectar(g, c, [x, y, w, h, des]) {
  g.save()
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + des); g.lineTo(x + w, y + des + h); g.lineTo(x, y + h); g.closePath(); g.clip()
  g.setTransform(...matriz(g, w / c.width, des / c.width, h / c.height, x, y))
  g.drawImage(c, 0, 0)
  g.restore()
}
// combina la transformación vigente (escala de pantalla) con la de la pantalla
function matriz(g, a, b, d, e, f) {
  const m = g.getTransform()
  return [m.a * a, m.b + m.d * b, 0, m.d * d, m.a * e + m.e, m.d * f + m.f]
}

export function dibujarPantallas(g, t, S, modo) {
  g.imageSmoothingEnabled = false
  const b = S.busqueda || { origen: 'SCL', destino: DESTINOS_DEMO[Math.floor(t / 20) % DESTINOS_DEMO.length] }
  const dest = S.aeropuerto?.(b.destino) || { ciudad: b.destino }
  const comp = S.comparador?.length ? S.comparador : NOMBRES.map((n, i) => ({ nombre: n, min: 400 + rnd(i + Math.floor(t / 30)) * 600 }))
  const datos = {
    origen: b.origen, destino: b.destino, destX: 26 + (rnd(b.destino.charCodeAt(0)) * 14), destY: 5 + rnd(b.destino.charCodeAt(1)) * 10,
    comparador: comp, semanas: S.torre?.semanas || Array.from({ length: 10 }, (_, i) => 100 + Math.sin(i + t / 40) * 8),
    tendencia: S.torre?.tendencia || 'estable', temp: S.torre?.clima?.max ?? 24, ciudad: dest.ciudad,
  }
  for (const [lista, id] of [[MARINE, 'francisco'], [COPA, 'copa']]) {
    const m = modo(id)
    const rapido = m === 'trabajando'
    for (const p of lista) {
      const [, , w, h] = p.q
      const c = lienzo(p.id, Math.round(w / PX), Math.round(h / PX))
      const cg = c.getContext('2d')
      cg.imageSmoothingEnabled = false
      ESCENAS[p.id](cg, c.width, c.height, t, rapido, datos)
      if (m === 'error') { cg.fillStyle = 'rgba(255,40,60,.28)'; cg.fillRect(0, 0, c.width, c.height) }
      proyectar(g, c, p.q)
    }
  }
}
