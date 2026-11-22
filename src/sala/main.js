/**
 * WELY Travel · la sala de agentes
 *
 * Fondo: la oficina de OpenClaw Office (github.com/wickedapp/openclaw-office, MIT), retocada y vacía;
 * las personas son sprites que se sientan, se paran y caminan. Encima: el letrero de neón WELY Travel,
 * la luz (canvas), las etiquetas, los globos de diálogo y las tarjetas que vuelan.
 *
 * Los datos vienen del código madre (src/nucleo/madre.js) a través del panel del buscador
 * (src/ui/buscador.js): la escena lee window.snEstado() y escucha los eventos 'sn:evento'.
 */
import '@fontsource/orbitron/latin-600.css'
import '@fontsource/orbitron/latin-800.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-800.css'
import '@fontsource/pacifico/latin-400.css'
import './oficina.css'
import fondoUrl from './oficina.webp'
import { iniciarBuscador } from '../ui/buscador.js'
import { crearActores } from './actores.js'
import { dibujarPantallas } from './pantallas.js'
import { EQUIPO, actividad, CHARLAS } from './equipo.js'
import { AEROPUERTOS, fmtUSD } from '../nucleo/datos.js'

// Coordenadas en píxeles de la imagen de fondo (2816 × 1536)
const ANCHO = 2816, ALTO = 1536
const COLORES = {
  carolina: '#5ef2d0', copa: '#4cc9f0', sky: '#7fd1ff', jetsmart: '#ffd166', iberia: '#ff8c42',
  francisco: '#3ef2ff', latam: '#ff6b9a', bob: '#c77dff',
}
const ROSA = '#ff4fa3'
const TRES_DIAS = 3 * 86400000

// Dónde está cada módulo en la oficina.
//  et: punto bajo la etiqueta · halo: [x, y, radioX, radioY] en el piso · cara: destino de las tarjetas
//  pantallas: rectángulos de pantallas que se encienden · brillo: [x, y, r] luz de un monitor de espaldas
const LUGARES = {
  wely: { et: [1410, 412], halo: [1410, 875, 330, 70], cara: [1410, 470] },
  copa: { et: [560, 404], halo: [600, 760, 250, 85], cara: [540, 490], brillo: [640, 470, 200] },
  carolina: { et: [770, 452], halo: [770, 888, 95, 26], cara: [770, 520] },
  latam: { et: [920, 772], halo: [975, 1085, 210, 70], cara: [920, 830], brillo: [1040, 930, 130] },
  jetsmart: { et: [493, 906], halo: [490, 1300, 250, 75], cara: [493, 965], brillo: [483, 1150, 95] },
  iberia: { et: [1410, 952], halo: [1410, 1300, 250, 75], cara: [1410, 1010], papeles: [1410, 1160] },
  francisco: { et: [2215, 288], halo: [2215, 760, 270, 85], cara: [2248, 495], brillo: [2215, 430, 260] },
  sky: { et: [1952, 818], halo: [1905, 1195, 220, 70], cara: [1955, 870], brillo: [1855, 985, 115] },
  bob: { et: [2378, 898], halo: [2420, 1265, 270, 70], cara: [2561, 1000], pizarra: [2200, 912, 356, 232] },
}
// Para módulos nuevos que aún no tienen escritorio en la imagen
const LIBRES = [[250, 1440], [1060, 1460], [1680, 1460], [2720, 1440], [170, 930], [2760, 1060]]
const AMPOLLETAS = [[467, 200], [591, 300], [663, 173], [749, 200], [2065, 187], [2212, 240], [2351, 187]]
const RACK_LEDS = Array.from({ length: 9 }, (_, i) => 382 + i * 34.5)

// ------------------------------------------------------------------ DOM
const app = document.getElementById('app')
app.innerHTML = `
  <div class="of-top">
    <div class="of-marca"><span class="of-dot"></span><b>WELY <i>Travel</i></b><span class="of-sub">Agentes IA que buscan tu vuelo en paralelo · código madre <code>madre.js</code></span></div>
    <div class="of-stats" id="of-stats"></div>
    <div class="of-reloj" id="of-reloj"></div>
    <button class="of-btn" id="of-full" title="Pantalla completa">⛶</button>
  </div>
  <div class="of-escenario" id="escenario">
    <div class="of-caja" id="caja">
      <img class="of-fondo" src="${fondoUrl}" alt="" draggable="false">
      <div class="of-neon wely" id="neon">
        <svg class="of-logo" viewBox="0 0 1000 400" aria-label="WELY Travel">
          <path class="estela" d="M 30 360 C 260 400, 700 395, 905 205"/>
          <g class="g-wely">
            <text class="wely-t tubo" x="500" y="185" text-anchor="middle">WELY</text>
            <text class="wely-t nucleo" x="500" y="185" text-anchor="middle">WELY</text>
          </g>
          <g class="g-air">
            <text class="air-t tubo" x="520" y="330" text-anchor="middle">Travel</text>
            <text class="air-t nucleo" x="520" y="330" text-anchor="middle">Travel</text>
          </g>
          <g class="avion" transform="translate(925 185) rotate(-38) scale(1.2)">
            <path d="M -44 0 L 26 -7 Q 48 0 26 7 Z M -2 -5 L -22 -40 L -10 -40 L 16 -5 Z M -2 5 L -22 40 L -10 40 L 16 5 Z M -36 -3 L -48 -20 L -40 -20 L -26 -3 Z"/>
          </g>
        </svg>
        <div class="of-lema">AGENCIA DE VIAJES · AGENTES IA</div>
      </div>
      <canvas id="pantallas"></canvas>
      <canvas id="actores"></canvas>
      <canvas id="luz"></canvas>
      <div class="of-capa" id="capa-et"></div>
      <div class="of-capa" id="capa-vuelo"></div>
      <div class="of-vineta"></div>
    </div>
  </div>
  <div class="sala-capa" id="capa"></div>`
const $ = (id) => document.getElementById(id)
const luz = $('luz')
const g = luz.getContext('2d')
const lienzoA = $('actores')
const gA = lienzoA.getContext('2d')
const lienzoP = $('pantallas')
const gP = lienzoP.getContext('2d')
const A = crearActores({ charla: elegirCharla })

// ------------------------------------------------------------------ escala
let escala = 0.5 // píxeles del canvas por píxel de la imagen
function encajar() {
  const top = document.querySelector('.of-top').getBoundingClientRect().height
  const dock = document.querySelector('.sn-dock')
  const abajo = dock ? dock.getBoundingClientRect().height + 22 : 0
  const w = window.innerWidth - 24, h = window.innerHeight - top - abajo - 16
  const k = Math.max(0.15, Math.min(w / ANCHO, h / ALTO))
  const W = Math.floor(ANCHO * k), H = Math.floor(ALTO * k)
  const caja = $('caja')
  caja.style.width = `${W}px`
  caja.style.height = `${H}px`
  caja.style.marginTop = `${top + 8}px`
  caja.style.setProperty('--k', W / 640) // las etiquetas se dimensionan como en una oficina de 640 px de arte
  // el canvas de luz va a la resolución real de la pantalla (máximo la de la imagen)
  const nuevo = Math.min(1, (W * (window.devicePixelRatio || 1)) / ANCHO)
  if (Math.abs(nuevo - escala) > 0.01 || luz.width !== Math.round(ANCHO * nuevo)) {
    escala = nuevo
    luz.width = lienzoA.width = lienzoP.width = Math.round(ANCHO * escala)
    luz.height = lienzoA.height = lienzoP.height = Math.round(ALTO * escala)
  }
}
window.addEventListener('resize', encajar)
setInterval(encajar, 800)

// ------------------------------------------------------------------ agentes
const agentes = new Map() // id -> agente
let wely = null
const pct = (x, y) => ({ left: `${(x / ANCHO) * 100}%`, top: `${(y / ALTO) * 100}%` })

function crearEtiqueta(id, nombre, rol, color, orquestador = false) {
  const el = document.createElement('div')
  el.className = `of-et${orquestador ? ' wely' : ''}`
  el.style.setProperty('--c', color)
  el.innerHTML = `<div class="burbuja"></div><button class="tag"><span class="n">${nombre}</span><span class="r">${rol}</span><span class="a"></span><i class="pt"></i></button>`
  if (!orquestador) el.querySelector('.tag').addEventListener('click', () => window.snSeleccionar?.(id))
  $('capa-et').appendChild(el)
  return el
}

let libre = 0
function construir(lista) {
  for (const a of lista) {
    if (agentes.has(a.id)) continue
    let lugar = LUGARES[a.id]
    if (!lugar) {
      const [x, y] = LIBRES[libre++ % LIBRES.length]
      lugar = { et: [x, y - 40], halo: [x, y, 130, 40], cara: [x, y - 20] }
    }
    const color = COLORES[a.id] || '#00f5ff'
    const p = {
      a, lugar, color, modo: null, exitoHasta: 0, fase: Math.random() * 6,
      el: crearEtiqueta(a.id, EQUIPO[a.id]?.nombre || a.nombre, EQUIPO[a.id]?.modulo || a.rol.replace(/ - .*/, ''), color),
    }
    Object.assign(p.el.style, pct(...lugar.et))
    agentes.set(a.id, p)
  }
  if (!wely) {
    wely = { el: crearEtiqueta('__orq', EQUIPO.wely.nombre, EQUIPO.wely.modulo, ROSA, true), mensaje: '' }
    Object.assign(wely.el.style, pct(...LUGARES.wely.et))
  }
}

function modoDe(p, S, ahora) {
  const id = p.a.id
  const s = S.st?.[id] || { estado: 'idle' }
  if (s.estado === 'working') return 'trabajando'
  if (s.estado === 'queued') return 'cola'
  if (s.estado === 'error') return 'error'
  if (s.estado === 'skipped') return 'omitido'
  if (p.exitoHasta > ahora) return 'exito'
  const h = S.historial?.[id]
  if (s.estado !== 'success' && h && !h.ok) return 'error'
  const sal = S.salidas?.[id]
  if (sal && Date.now() - sal.mtime > TRES_DIAS && s.estado !== 'success') return 'dormido'
  return 'inactivo'
}

// ------------------------------------------------------------------ etiquetas y burbujas (estilo OpenClaw)
const fmtSeg = (s) => { s = Math.round(s); const m = Math.floor(s / 60); return m ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s` }
function ponerActividad(el, txt) {
  const a = el.querySelector('.tag .a')
  if (a.textContent !== txt) a.textContent = txt
}
function actualizarEtiqueta(p, S, t) {
  const s = S.st?.[p.a.id] || {}
  ponerActividad(p.el, actividad(p.a.id, p.modo, s, t, A.act[p.a.id]?.nota))
  const pc = Math.round((window.snPct?.(p.a.id) || 0) * 100)
  const modo = p.modo
  let html = ''
  if (modo === 'trabajando') html = `<b>⚡ Trabajando <em>${pc}%</em></b><i class="barra"><i style="width:${pc}%"></i></i>`
  else if (modo === 'error') html = `<b class="mal">⚠ Falló</b><span>${s.msg || 'Revisa la terminal'}</span>`
  else if (modo === 'exito') html = `<b class="bien">✓ Listo</b><span>${s.dur ? fmtSeg(s.dur) : ''}</span>`
  else if (modo === 'cola') html = '<b class="cola">⏳ En cola</b>'
  else if (modo === 'omitido') html = '<b class="zz">— No seleccionada</b>'
  const firma = `${modo}|${html}|${S.sel === p.a.id}`
  if (p.firma === firma) return
  p.firma = firma
  p.el.className = `of-et ${modo}${S.sel === p.a.id ? ' sel' : ''}`
  const b = p.el.querySelector('.burbuja')
  b.innerHTML = html
  b.style.display = html ? '' : 'none'
}
function actualizarOrq(S, t) {
  const act = S.agentes?.find((a) => a.id === S.actual)
  const enCurso = (S.cola || []).filter((id) => S.st?.[id]?.estado === 'working').length
  ponerActividad(wely.el, A.act.wely?.nota || (S.corriendo ? `Coordinando ${enCurso} agentes en paralelo` : actividad('wely', 'inactivo', {}, t)))
  const cola = S.cola || []
  const hechos = cola.filter((id) => ['success', 'error'].includes(S.st?.[id]?.estado)).length
  let html = ''
  if (S.corriendo) html = `<b>📋 Coordinando <em>${hechos}/${cola.length}</em></b><span>${enCurso ? `${enCurso} trabajando a la vez` : 'Repartiendo trabajo…'}</span>`
  else if (S.ultima) html = S.resultado?.propuestas?.length ? '<b class="bien">✓ Top 3 listo</b>' : '<b class="mal">⚠ Sin vuelos con esos filtros</b>'
  const firma = `${html}|${S.corriendo}`
  if (wely.firma === firma) return
  wely.firma = firma
  wely.el.className = `of-et wely${S.corriendo ? ' trabajando' : ''}`
  const b = wely.el.querySelector('.burbuja')
  b.innerHTML = html
  b.style.display = html ? '' : 'none'
}

// ------------------------------------------------------------------ tarjetas que vuelan (delegación y retorno)
function volar(desde, hasta, html, clase, ms = 2200) {
  const capa = $('capa-vuelo')
  const card = document.createElement('div')
  card.className = `of-vuelo ${clase}`
  card.innerHTML = html
  capa.appendChild(card)
  const a = pct(desde[0], desde[1]), b = pct(hasta[0], hasta[1])
  const mx = `${(((desde[0] + hasta[0]) / 2) / ANCHO) * 100}%`, my = `${((Math.min(desde[1], hasta[1]) - 180) / ALTO) * 100}%`
  card.animate([
    { left: a.left, top: a.top, transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
    { left: mx, top: my, transform: 'translate(-50%,-50%) scale(1.15) rotate(-4deg)', opacity: 1, offset: 0.5 },
    { left: b.left, top: b.top, transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0.92 },
    { left: b.left, top: b.top, transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
  ], { duration: ms, easing: 'ease-in-out' }).onfinish = () => card.remove()
  for (let i = 0; i < 5; i++) {
    const pt = document.createElement('i')
    pt.className = `of-chispa ${clase}`
    capa.appendChild(pt)
    pt.animate([
      { left: a.left, top: a.top, opacity: 0, transform: 'scale(0)' },
      { left: mx, top: my, opacity: 0.9, transform: 'scale(1)', offset: 0.5 },
      { left: b.left, top: b.top, opacity: 0, transform: 'scale(0)' },
    ], { duration: ms, delay: i * 80, easing: 'ease-in-out' }).onfinish = () => pt.remove()
  }
  setTimeout(() => {
    const f = document.createElement('i'); f.className = `of-flash ${clase}`; Object.assign(f.style, b); capa.appendChild(f)
    f.animate([{ transform: 'translate(-50%,-50%) scale(0)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 }], { duration: 600 }).onfinish = () => f.remove()
  }, ms * 0.9)
}

// ------------------------------------------------------------------ diálogos entre agentes
const nombreDe = (id) => EQUIPO[id]?.nombre || id
const usadas = new Set()
const dialogos = [] // { id, el, hasta }
function decir(id, texto, seg = 2.8) {
  const viejo = dialogos.find((d) => d.id === id)
  if (viejo) { viejo.el.remove(); dialogos.splice(dialogos.indexOf(viejo), 1) }
  const el = document.createElement('div')
  el.className = 'of-dialogo'
  el.innerHTML = `<b>${nombreDe(id)}</b>${texto}`
  $('capa-et').appendChild(el)
  dialogos.push({ id, el, hasta: performance.now() / 1000 + seg })
}
function actualizarDialogos() {
  const ahora = performance.now() / 1000
  for (let i = dialogos.length - 1; i >= 0; i--) {
    const d = dialogos[i]
    if (ahora > d.hasta) { d.el.classList.add('fuera'); setTimeout(() => d.el.remove(), 300); dialogos.splice(i, 1); continue }
    const c = A.cabeza(d.id)
    if (!c) continue
    const der = c[0] > ANCHO * 0.72
    const pos = pct(c[0] + (der ? -60 : 60), c[1] + 10)
    const k = `${pos.left}|${pos.top}|${der}`
    if (d.el.dataset.k !== k) { d.el.dataset.k = k; Object.assign(d.el.style, pos); d.el.classList.toggle('izq', der) }
  }
}
function guion(lineas, ids) {
  let t0 = 0
  for (const [quien, texto] of lineas) {
    const id = quien === 'a' ? ids[0] : ids[1]
    const seg = Math.min(4.2, 1.6 + texto.length * 0.045)
    setTimeout(() => decir(id, texto, seg), t0 * 1000)
    t0 += seg + 0.25
  }
  return t0
}
function elegirCharla(visitante, libres) {
  const opciones = CHARLAS.map((c, i) => [c, i]).filter(([c]) => c[0] === visitante && c[1] !== visitante && libres.includes(c[1]))
  if (!opciones.length) return null
  let frescas = opciones.filter(([, i]) => !usadas.has(i))
  if (!frescas.length) { for (const [, i] of opciones) usadas.delete(i); frescas = opciones }
  const [[, host, lineas], i] = frescas[Math.floor(Math.random() * frescas.length)]
  usadas.add(i)
  const dur = lineas.reduce((s, [, x]) => s + Math.min(4.2, 1.6 + x.length * 0.045) + 0.25, 0) + 0.6
  return { host, dur, nota: `Conversando con ${nombreDe(host)}`, iniciar: () => guion(lineas, [visitante, host]) }
}

const reunion = (id) => ((A.cabeza(id)?.[0] ?? 0) < 1410 ? A.DESTINOS.reunionIzq : A.DESTINOS.reunionDer)
const ciudad = (c) => AEROPUERTOS[c]?.ciudad || c
const AEROLINEA = { latam: 'LATAM', sky: 'SKY', jetsmart: 'JetSMART', copa: 'Copa', iberia: 'Iberia' }
let llegadas = 0, ultimaReaccion = 0
// Una aerolínea comenta lo que acaba de decir otra (sin pisarse ni repetirse todo el rato)
function reaccionar(id, texto) {
  const ahora = performance.now() / 1000
  if (!AEROLINEA[id] || !/USD/.test(texto) || ahora - ultimaReaccion < 3 || Math.random() < 0.35) return
  const S = window.snEstado?.() || {}
  const mio = S.comparador?.find((c) => c.nombre === AEROLINEA[id])
  if (!mio) return
  const otros = (S.comparador || []).filter((c) => c.nombre !== AEROLINEA[id])
  ultimaReaccion = ahora
  let quien, linea
  const mas = otros.find((c) => c.min < mio.min)
  if (mas) {
    quien = Object.keys(AEROLINEA).find((k) => AEROLINEA[k] === mas.nombre)
    linea = [`Yo lo tengo en ${fmtUSD(mas.min)}. Sigo adelante.`, `Por ahora voy ganando con ${fmtUSD(mas.min)}.`, `Buen intento, ${AEROLINEA[id]}: el mío sale ${fmtUSD(mas.min)}.`][Math.floor(Math.random() * 3)]
  } else {
    quien = 'francisco'
    linea = [`Anotado: ${AEROLINEA[id]} pasa adelante con ${fmtUSD(mio.min)}.`, `${AEROLINEA[id]} toma la delantera en el comparador.`, `Nuevo mejor precio: ${AEROLINEA[id]}, ${fmtUSD(mio.min)}.`][Math.floor(Math.random() * 3)]
  }
  setTimeout(() => decir(quien, linea, 3.2), 1900)
}
window.addEventListener('sn:evento', (ev) => {
  const d = ev.detail
  if (!wely) return
  const p = agentes.get(d.agent)
  if (d.type === 'RUN_STARTED') {
    llegadas = 0
    for (const id of Object.keys(A.caminantes)) if (!A.act[id].sentado) A.encolar(id, [A.sentarse()])
    decir('wely', `¡Equipo! Buscamos ${ciudad(d.busqueda.origen)} → ${ciudad(d.busqueda.destino)}. Todos a la vez.`, 3.4)
  }
  if (d.type === 'AGENT_TRIGGERED' && p) volar(A.cabeza('wely'), A.cabeza(d.agent) || p.lugar.cara, `📋 <span>${EQUIPO[d.agent]?.nombre}</span>`, 'ida', 1300)
  if (d.type === 'AGENT_SAY') { decir(d.agent, d.texto, Math.min(5.5, 2.4 + d.texto.length * 0.04)); reaccionar(d.agent, d.texto) }
  if (d.type === 'BUILD_COMPLETE' && p && d.status !== 'skipped') {
    const ok = d.status === 'success'
    if (ok) p.exitoHasta = performance.now() / 1000 + 3.5
    const r = d.resultado
    const corto = r?.ofertas ? (r.ofertas.length ? fmtUSD(r.ofertas[0].total) : 'sin vuelos') : r?.propuestas ? 'top 3' : 'listo'
    const html = ok ? `✅ <span>${EQUIPO[d.agent]?.nombre}: ${corto}</span>` : `⚠ <span>${EQUIPO[d.agent]?.nombre} falló</span>`
    const lleva = ok && (!r?.ofertas || r.ofertas.length > 0) && A.caminantes[d.agent]
    if (lleva) {
      const espera = 0.7 * (llegadas++ % 4)
      A.encolar(d.agent, [A.esperar(espera), A.hacer((a) => { a.nota = 'Lleva su resultado a Wely' }), A.ir(reunion(d.agent)),
        A.hacer(() => volar(A.cabeza(d.agent), A.cabeza('wely'), html, 'vuelta', 1000)), A.esperar(1.1), A.hacer((a) => { a.nota = 'Vuelve a su puesto' }), A.sentarse()])
    } else volar(A.cabeza(d.agent) || p.lugar.cara, A.cabeza('wely'), html, ok ? 'vuelta' : 'falla', 1500)
  }
  if (d.type === 'RUN_FINISHED' && !d.errores) setTimeout(() => decir('wely', d.resultado?.propuestas?.length ? '¡Listo! Aquí están las 3 mejores propuestas.' : 'Con esos filtros no hay vuelos. Ajustemos la búsqueda.', 3.6), 1500)
})

// ------------------------------------------------------------------ selección y enfoque
window.sala = {
  enfocar(id) {
    const p = agentes.get(id)
    if (!p) return
    p.el.classList.remove('foco'); void p.el.offsetWidth; p.el.classList.add('foco')
  },
}
luz.addEventListener('click', (e) => {
  const r = luz.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * ANCHO, y = ((e.clientY - r.top) / r.height) * ALTO
  let mejor = null, dMin = 260
  for (const p of agentes.values()) {
    const [hx, hy] = p.lugar.halo, [cx, cy] = p.lugar.cara
    const d = Math.min(Math.hypot(x - cx, y - cy), Math.hypot(x - hx, (y - hy) * 1.6))
    if (d < dMin) { dMin = d; mejor = p }
  }
  if (mejor) window.snSeleccionar?.(mejor.a.id)
})

// ------------------------------------------------------------------ luz y efectos (canvas sobre la foto)
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function resplandor(x, y, r, color, a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, rgba(color, a)); gr.addColorStop(1, rgba(color, 0))
  g.fillStyle = gr
  g.fillRect(x - r, y - r, r * 2, r * 2)
}
function halo(x, y, rx, ry, color, a) {
  g.save()
  g.translate(x, y); g.scale(1, ry / rx)
  const gr = g.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx)
  gr.addColorStop(0, rgba(color, a)); gr.addColorStop(0.65, rgba(color, a * 0.45)); gr.addColorStop(1, rgba(color, 0))
  g.fillStyle = gr
  g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill()
  g.restore()
}
function anillo(x, y, rx, ry, color, a, w = 6) {
  g.save()
  g.strokeStyle = rgba(color, a); g.lineWidth = w; g.shadowColor = color; g.shadowBlur = 24 * escala
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.stroke()
  g.restore()
}
const azar = (n) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1
// Pantalla trabajando: tinte del color del módulo, líneas de código que corren y una línea de barrido
function pantalla([x, y, w, h], color, t, semilla) {
  g.save()
  g.beginPath(); g.rect(x, y, w, h); g.clip()
  g.fillStyle = rgba(color, 0.16); g.fillRect(x, y, w, h)
  const salto = 15
  const avance = t * 38 + semilla * 50
  const corr = avance % salto
  const base = Math.floor(avance / salto)
  for (let i = -1; i < h / salto + 1; i++) {
    const fila = base + i
    const largo = 0.25 + azar(fila + semilla * 100) * 0.65
    const sangria = (fila % 4) * 8
    g.fillStyle = rgba(color, 0.55)
    g.fillRect(x + 10 + sangria, y + h - (i * salto + corr), (w - 30 - sangria) * largo, 5)
  }
  const by = y + ((t * 0.6 + semilla * 0.3) % 1) * h
  const gr = g.createLinearGradient(0, by - 14, 0, by + 2)
  gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(1, rgba(color, 0.5))
  g.fillStyle = gr; g.fillRect(x, by - 14, w, 16)
  g.restore()
}

function cuadro(t, S) {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, luz.width, luz.height)
  g.setTransform(escala, 0, 0, escala, 0, 0)
  g.globalCompositeOperation = 'lighter'

  // ampolletas: luz cálida que titila apenas
  for (const [x, y] of AMPOLLETAS) {
    const f = 0.8 + Math.sin(t * 5 + x) * 0.05 + Math.sin(t * 17 + y) * 0.03 + (Math.random() < 0.003 ? -0.35 : 0)
    resplandor(x, y + 10, 170, '#ffb45a', 0.16 * f)
    resplandor(x, y + 10, 45, '#ffe2a8', 0.35 * f)
  }
  // el neón tiñe la pared de naranjo
  resplandor(1300, 210, 440, ROSA, 0.09 + Math.sin(t * 1.3) * 0.012)
  resplandor(1600, 240, 300, '#3ef2ff', 0.07 + Math.sin(t * 1.7) * 0.01)

  // capitana: halo rosado en el piso, pulsa más rápido cuando hay corrida
  if (wely) {
    const corr = Boolean(S.corriendo)
    const [x, y, rx, ry] = LUGARES.wely.halo
    const pulso = corr ? 0.6 + 0.4 * Math.sin(t * 4) : 0.55 + 0.15 * Math.sin(t * 1.5)
    halo(x, y, rx, ry, ROSA, 0.22 * pulso)
    if (corr) { const k = (t * 0.5) % 1; anillo(x, y, rx * (0.75 + k * 0.35), ry * (0.75 + k * 0.35), ROSA, 0.5 * (1 - k)) }
  }

  // rack: LEDs que parpadean; más rápido cuando empaqueta o despliega
  const rackActivo = Boolean(S.corriendo)
  const vel = rackActivo ? 9 : 1.6
  RACK_LEDS.forEach((y, i) => {
    for (let j = 0; j < 4; j++) {
      const on = Math.sin(t * vel * (1 + j * 0.37) + i * 2.1 + j) > (rackActivo ? -0.1 : 0.35)
      if (on) resplandor(2552 + j * 12, y, 12, '#5dff5d', 0.55)
    }
    if (rackActivo && Math.sin(t * 13 + i) > 0.6) resplandor(2681, y, 10, '#ff4d4d', 0.6)
  })

  // agentes
  for (const p of agentes.values()) {
    const L = p.lugar
    const [hx, hy, rx, ry] = L.halo
    const m = p.modo
    if (m === 'trabajando') {
      const pul = 0.75 + 0.25 * Math.sin(t * 5 + p.fase)
      halo(hx, hy, rx, ry, p.color, 0.28 * pul)
      anillo(hx, hy, rx * 0.9, ry * 0.9, p.color, 0.35 * pul, 5)
      L.pantallas?.forEach((r, i) => pantalla(r, p.color, t, i + p.fase))
      if (L.brillo) { const [bx, by, br] = L.brillo; resplandor(bx, by, br * (1 + 0.08 * Math.sin(t * 9 + p.fase)), p.color, 0.32) }
      if (L.pizarra) {
        const [x, y, w, h] = L.pizarra
        const sx = x + ((t * 0.35) % 1) * w
        const gr = g.createLinearGradient(sx - 60, 0, sx + 10, 0)
        gr.addColorStop(0, rgba(p.color, 0)); gr.addColorStop(1, rgba(p.color, 0.35))
        g.fillStyle = gr; g.fillRect(sx - 60, y, 70, h)
      }
      if (L.papeles) {
        // hojas que suben de la pila de papeles
        for (let i = 0; i < 4; i++) {
          const k = (t * 0.45 + i / 4 + p.fase) % 1
          const px = L.papeles[0] + Math.sin(k * 6 + i * 2) * 120 + (i - 1.5) * 50
          const py = L.papeles[1] - k * 210
          g.fillStyle = rgba('#fff4dc', 0.75 * (1 - k)); g.fillRect(px - 14, py - 18, 28, 36)
          g.fillStyle = rgba(p.color, 0.6 * (1 - k)); g.fillRect(px - 9, py - 10, 18, 3); g.fillRect(px - 9, py - 3, 14, 3)
        }
      }
    } else if (m === 'error') {
      const pul = 0.5 + 0.5 * Math.sin(t * 6)
      halo(hx, hy, rx, ry, '#ff2a4a', 0.3 * pul)
      L.pantallas?.forEach(([x, y, w, h]) => { g.fillStyle = rgba('#ff2a4a', 0.22 * pul); g.fillRect(x, y, w, h) })
      if (L.brillo) resplandor(L.brillo[0], L.brillo[1], L.brillo[2], '#ff2a4a', 0.25 * pul)
    } else if (m === 'exito') {
      halo(hx, hy, rx, ry, '#39ff14', 0.3)
      const k = (t * 0.9) % 1
      anillo(hx, hy, rx * (0.6 + k * 0.5), ry * (0.6 + k * 0.5), '#39ff14', 0.6 * (1 - k))
    } else if (m === 'cola') {
      halo(hx, hy, rx, ry, '#ffa94d', 0.1 + 0.05 * Math.sin(t * 2 + p.fase))
    } else if (S.sel === p.a.id) {
      halo(hx, hy, rx, ry, p.color, 0.16)
    }
    if (S.sel === p.a.id) anillo(hx, hy, rx, ry, '#ffffff', 0.45, 4)
  }
  g.globalCompositeOperation = 'source-over'
}

// ------------------------------------------------------------------ cabecera
function actualizarCabecera(S) {
  const ag = S.agentes || []
  const n = (f) => ag.filter((a) => f(S.st?.[a.id]?.estado)).length
  const trab = n((e) => e === 'working'), cola = n((e) => e === 'queued')
  const mal = ag.filter((a) => S.st?.[a.id]?.estado === 'error' || (S.st?.[a.id]?.estado !== 'success' && S.historial?.[a.id] && !S.historial[a.id].ok)).length
  const html = `<span class="s cian">${ag.length} <small>agentes</small></span><span class="s amarillo">${trab} <small>trabajando</small></span><span class="s gris">${cola} <small>en cola</small></span><span class="s rojo">${mal} <small>con error</small></span>`
  if ($('of-stats').dataset.h !== html) { $('of-stats').dataset.h = html; $('of-stats').innerHTML = html }
  $('of-reloj').textContent = new Date().toLocaleTimeString('es-CL', { hour12: false })
}

$('of-full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})

// ------------------------------------------------------------------ arranque
iniciarBuscador($('capa'))
encajar()
let previo = 0
function seguir(el, a, et) {
  // la etiqueta acompaña al agente cuando camina
  const pos = a && !a.sentado ? [a.x, a.y - 445] : et
  const k = `${Math.round(pos[0])},${Math.round(pos[1])}`
  if (el.dataset.pos === k) return
  el.dataset.pos = k
  Object.assign(el.style, pct(pos[0], pos[1]))
  el.classList.toggle('camina', Boolean(a && !a.sentado))
}
function bucle(ms) {
  const t = ms / 1000
  const dt = Math.min(0.05, previo ? t - previo : 0.016)
  previo = t
  const S = window.snEstado?.() || {}
  if (S.agentes?.length) construir(S.agentes)
  for (const p of agentes.values()) { p.modo = modoDe(p, S, t); actualizarEtiqueta(p, S, t); seguir(p.el, A.act[p.a.id], p.lugar.et) }
  if (wely) { actualizarOrq(S, t); seguir(wely.el, A.act.wely, LUGARES.wely.et) }
  A.tick(dt, S.corriendo)
  A.pasear(dt, S)
  gP.setTransform(1, 0, 0, 1, 0, 0)
  gP.clearRect(0, 0, lienzoP.width, lienzoP.height)
  gP.setTransform(escala, 0, 0, escala, 0, 0)
  dibujarPantallas(gP, t, S, (id) => agentes.get(id)?.modo || 'inactivo')
  actualizarDialogos()
  gA.setTransform(1, 0, 0, 1, 0, 0)
  gA.clearRect(0, 0, lienzoA.width, lienzoA.height)
  gA.setTransform(escala, 0, 0, escala, 0, 0)
  gA.imageSmoothingEnabled = escala < 0.75
  A.dibujar(gA, t, S, (id) => (id === 'wely' ? (S.corriendo ? 'trabajando' : 'inactivo') : agentes.get(id)?.modo || 'inactivo'))
  cuadro(t, S)
  requestAnimationFrame(bucle)
}
requestAnimationFrame(bucle)
setInterval(() => actualizarCabecera(window.snEstado?.() || {}), 500)
