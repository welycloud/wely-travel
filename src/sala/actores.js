/**
 * Los agentes de la oficina: personas recortadas de la imagen que se sientan, se paran y caminan.
 *
 * - Sentados: el recorte original de cada persona, con una animación suave (respira, teclea, se
 *   desanima si falla, salta si termina bien). Debajo está la silla vacía del fondo.
 * - Caminando: un cuerpo de pie con 8 cuadros de caminata y la cabeza de cada persona.
 * - Todo se ordena por la línea del piso (y de los pies), así un escritorio o una planta
 *   tapan a quien pasa detrás.
 *
 * Coordenadas en píxeles de la imagen de fondo (2816 × 1536).
 */
import meta from './sprites/meta.json'

const archivos = import.meta.glob('./sprites/*.webp', { eager: true, query: '?url', import: 'default' })
const img = {}
for (const [ruta, url] of Object.entries(archivos)) {
  const nombre = ruta.replace('./sprites/', '').replace('.webp', '')
  const i = new Image()
  i.src = url
  img[nombre] = i
}
const lista = (i) => i && i.complete && i.naturalWidth > 0

export const PASILLO = 895
const VEL = 330 // px de imagen por segundo
const PASO = 24 // px recorridos por cuadro de caminata

// Quién camina: dónde se sienta, el camino del pasillo a su asiento y la línea del piso de su escritorio
const CAMINANTES = {
  wely: { asiento: [1410, 600], via: [[1690, PASILLO], [1690, 600], [1410, 600]], base: 850, carril: 0 },
  latam: { asiento: [912, 958], via: [[912, PASILLO], [912, 958]], base: 1180, carril: -10 },
  jetsmart: { asiento: [497, 1112], via: [[497, PASILLO], [497, 1112]], base: 1400, carril: 8 },
  iberia: { asiento: [1410, 1122], via: [[1410, PASILLO], [1410, 1122]], base: 1400, carril: 14 },
  sky: { asiento: [1962, 958], via: [[1962, PASILLO], [1962, 958]], base: 1240, carril: -6 },
  bob: { asiento: [2562, 1390], via: [[2668, PASILLO], [2668, 1395], [2562, 1390]], base: 1390, carril: 4 },
  copa: { asiento: [600, 862], via: [[600, PASILLO], [600, 862]], base: 830, carril: -4 },
  francisco: { asiento: [2240, 885], via: [[2240, PASILLO], [2240, 885]], base: 850, carril: 12 },
  // Tomás trabaja de pie junto al archivador de las carolina
  carolina: { asiento: [770, 888], via: [[770, PASILLO], [770, 888]], base: 888, carril: 6, dePie: true, mira: -1 },
}
const SENTADOS = {}
// Dónde se para quien viene a conversar con cada uno
export const VISITA = {
  wely: [[1290, PASILLO]], copa: [[690, PASILLO]], carolina: [[880, PASILLO]], latam: [[1070, PASILLO]],
  jetsmart: [[785, PASILLO], [785, 1130]], iberia: [[1180, PASILLO], [1170, 1040]], sky: [[2100, PASILLO]],
  francisco: [[2130, PASILLO]], bob: [[2668, PASILLO], [2700, 1250]],
}
// Objetos que tapan a quien pasa detrás
const TAPAS = [
  { img: 'planta-der', x: 1680, y: 410, base: 695 },
  { img: 'monitor-latam', x: 955, y: 850, base: 1000 },
  { img: 'monitor-sky', x: 1755, y: 850, base: 1000 },
]
// Lugares a los que se camina (siempre desde el pasillo)
const P = (...pts) => pts
export const DESTINOS = {
  reunionIzq: P([1290, PASILLO]),
  reunionDer: P([1530, PASILLO]),
  copa: P([640, PASILLO]),
  carolina: P([790, PASILLO]),
  francisco: P([2215, PASILLO]),
  zip: P([2590, PASILLO]),
  deploy: P([2600, PASILLO]),
  ventana: P([310, PASILLO], [300, 860]),
  plantaIzq: P([1120, PASILLO]),
  cafe: P([1610, PASILLO]),
  pizarra: P([2668, PASILLO], [2668, 1395], [2440, 1405]),
  pizarra2: P([2668, PASILLO], [2668, 1395], [2700, 1385]),
  rack: P([2470, PASILLO]),
  centro: P([1180, PASILLO]),
  mapaPasillo: P([2080, PASILLO]),
}
const PASEOS = ['ventana', 'plantaIzq', 'cafe', 'pizarra', 'rack', 'centro', 'mapaPasillo', 'copa', 'francisco']

export function crearActores({ charla } = {}) {
  const act = {}
  for (const [id, c] of Object.entries(CAMINANTES)) {
    act[id] = {
      id, c, sentado: true, x: c.asiento[0], y: c.asiento[1], via: c.via, ruta: [], tareas: [],
      dir: 1, dist: 0, cuadro: 0, espera: 0, fase: Math.random() * 6, salto: 0, paseo: false,
    }
  }
  for (const [id, c] of Object.entries(SENTADOS)) act[id] = { id, c, sentado: true, soloSentado: true, fase: Math.random() * 6, salto: 0, tareas: [] }

  // ------------------------------------------------------------ rutas
  function planificar(a, via) {
    const actual = a.via || [[a.x, a.y]]
    // prefijo común entre donde está y adonde va (p. ej. pasearse frente a la pizarra)
    let k = 0
    while (k < actual.length && k < via.length && actual[k][0] === via[k][0] && actual[k][1] === via[k][1]) k++
    const pts = []
    const carril = PASILLO + (a.c.carril || 0)
    if (k > 0) {
      for (let i = actual.length - 2; i >= k - 1; i--) pts.push(actual[i])
      for (let i = k; i < via.length; i++) pts.push(via[i])
    } else {
      for (let i = actual.length - 2; i >= 0; i--) pts.push(actual[i])
      const desde = pts.length ? pts[pts.length - 1] : [a.x, a.y]
      pts.push([desde[0], carril], [via[0][0], carril])
      for (let i = 0; i < via.length; i++) pts.push(i === 0 && via.length > 1 ? [via[0][0], carril] : via[i])
    }
    a.ruta = pts
    a.via = via
  }
  const ir = (via) => ({ t: 'ir', via })
  const esperar = (s) => ({ t: 'esperar', s })
  const hacer = (f) => ({ t: 'fn', f })
  const sentarse = () => ({ t: 'ir', via: null })

  function encolar(id, tareas, { paseo = false } = {}) {
    const a = act[id]
    if (!a || a.soloSentado) return
    if (!paseo) {
      // el trabajo manda: se descartan los paseos pendientes
      a.tareas = a.tareas.filter((t) => !t.paseo)
      if (a.paseo) { a.paseo = false; a.ruta = []; a.espera = 0 }
    }
    for (const t of tareas) a.tareas.push({ ...t, paseo })
  }

  function avanzar(a, dt, vel) {
    if (a.soloSentado) return
    if (a.espera > 0) { a.espera -= dt; return }
    if (a.ruta.length) {
      const [tx, ty] = a.ruta[0]
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy)
      const paso = vel * dt
      if (Math.abs(dx) > 1) a.dir = dx < 0 ? -1 : 1
      if (d <= paso) { a.x = tx; a.y = ty; a.ruta.shift() } else { a.x += (dx / d) * paso; a.y += (dy / d) * paso }
      a.dist += Math.min(paso, d)
      a.cuadro = 1 + (Math.floor(a.dist / PASO) % 7)
      return
    }
    a.cuadro = 0
    const t = a.tareas.shift()
    if (!t) { if (a.paseo) a.paseo = false; return }
    a.paseo = Boolean(t.paseo)
    if (t.t === 'ir') {
      a.sentado = false
      planificar(a, t.via || a.c.via)
      if (!t.via) a.ruta.push(null) // marca: al llegar se sienta
    } else if (t.t === 'esperar') a.espera = t.s
    else if (t.t === 'fn') t.f(a)
  }

  function tick(dt, corriendo) {
    const vel = corriendo ? VEL * 1.25 : VEL
    for (const a of Object.values(act)) {
      if (a.soloSentado) continue
      if (a.ruta.length && a.ruta[0] === null) { a.ruta.shift(); a.sentado = true; a.nota = null; a.x = a.c.asiento[0]; a.y = a.c.asiento[1]; a.via = a.c.via; continue }
      avanzar(a, dt, vel)
    }
  }

  // ------------------------------------------------------------ paseos cuando no hay trabajo
  let proximo = 3
  function pasear(dt, S) {
    proximo -= dt
    if (proximo > 0) return
    proximo = (S.corriendo ? 7 : 4) + Math.random() * (S.corriendo ? 8 : 6)
    const libres = Object.values(act).filter((a) => {
      if (a.soloSentado || a.tareas.length || a.ruta.length || a.espera > 0 || !a.sentado) return false
      const e = S.st?.[a.id]?.estado
      if (e === 'working' || e === 'queued') return false
      if (a.id === 'wely' && S.corriendo) return false
      return true
    })
    if (!libres.length) return
    const a = libres[Math.floor(Math.random() * libres.length)]
    if (charla && !S.corriendo && Math.random() < 0.6) {
      const c = charla(a.id, libres.map((x) => x.id))
      if (c) {
        const host = act[c.host]
        encolar(a.id, [ir(VISITA[c.host]), hacer((v) => { v.dir = host.c.asiento[0] < v.x ? -1 : 1; v.nota = c.nota; c.iniciar() }), esperar(c.dur), sentarse()], { paseo: true })
        return
      }
    }
    if (a.id === 'bob' && Math.random() < 0.6) {
      encolar(a.id, [ir(DESTINOS.pizarra2), esperar(1.5 + Math.random() * 2), ir(DESTINOS.pizarra), esperar(1.5 + Math.random() * 2), sentarse()], { paseo: true })
      return
    }
    const opciones = PASEOS.filter((n) => n !== a.id)
    const d1 = DESTINOS[opciones[Math.floor(Math.random() * opciones.length)]]
    const tareas = [ir(d1), esperar(2 + Math.random() * 4)]
    if (Math.random() < 0.4) {
      const d2 = DESTINOS[opciones[Math.floor(Math.random() * opciones.length)]]
      tareas.push(ir(d2), esperar(1.5 + Math.random() * 3))
    }
    tareas.push(sentarse())
    encolar(a.id, tareas, { paseo: true })
  }

  // ------------------------------------------------------------ dibujo
  function cabeza(id) {
    const a = act[id]
    if (!a) return null
    if (a.sentado && !a.c.dePie) { const m = meta[id].sentado; return [m[0] + m[2] / 2, m[1] + 40] }
    return [a.x, a.y - 380]
  }

  function dibujar(g, t, S, modoDe) {
    const items = []
    for (const a of Object.values(act)) {
      const m = meta[a.id]
      const modo = modoDe(a.id)
      if (a.sentado && a.c.dePie) {
        const [W, H, ax, ay] = m.caminar
        const im = img[`caminar-${a.id}`]
        let dy = Math.sin(t * 2 + a.fase) * 1.2, dir = a.c.mira
        if (modo === 'trabajando') { dy = -Math.abs(Math.sin(t * 5)) * 5; dir = Math.sin(t * 0.9) > 0 ? -1 : 1 }
        else if (modo === 'exito') dy = -Math.abs(Math.sin(t * 7)) * 16
        items.push({
          base: a.c.base,
          f: () => {
            g.save(); g.fillStyle = 'rgba(30,12,4,0.32)'; g.beginPath(); g.ellipse(a.x, a.y - 2, 52, 13, 0, 0, Math.PI * 2); g.fill(); g.restore()
            if (!lista(im)) return
            g.save(); g.translate(a.x, a.y); if (dir < 0) g.scale(-1, 1)
            if (modo === 'error') g.filter = 'saturate(0.6) brightness(0.85)'
            g.drawImage(im, 0, 0, W, H, -ax, -ay + dy, W, H); g.restore()
          },
        })
      } else if (a.sentado) {
        // animación sentado
        let dy = 0, dx = 0
        if (modo === 'trabajando') { dy = -Math.abs(Math.sin(t * 9 + a.fase)) * 5; dx = Math.sin(t * 1.3 + a.fase) * 3 }
        else if (modo === 'error') dy = 6
        else if (modo === 'exito') dy = -Math.abs(Math.sin(t * 7)) * 14
        else { dy = Math.sin(t * 1.7 + a.fase) * 2; dx = Math.sin(t * 0.45 + a.fase) * 2.5 }
        const s = m.sentado
        items.push({
          base: a.c.base,
          f: () => {
            if (m.piernas && lista(img[`piernas-${a.id}`])) g.drawImage(img[`piernas-${a.id}`], m.piernas[0], m.piernas[1])
            const im = img[`sentado-${a.id}`]
            if (!lista(im)) return
            if (modo === 'error') g.filter = 'saturate(0.6) brightness(0.85)'
            g.drawImage(im, s[0] + dx, s[1] + dy)
            g.filter = 'none'
            if (m.silla && lista(img['silla-francisco'])) g.drawImage(img['silla-francisco'], m.silla[0], m.silla[1])
          },
        })
      } else {
        const [W, H, ax, ay] = m.caminar
        const im = img[`caminar-${a.id}`]
        const respira = a.cuadro === 0 ? Math.sin(t * 2 + a.fase) * 1.2 : 0
        items.push({
          base: a.y,
          f: () => {
            // sombra en el piso
            g.save(); g.fillStyle = 'rgba(30,12,4,0.32)'; g.beginPath(); g.ellipse(a.x, a.y - 2, 52, 13, 0, 0, Math.PI * 2); g.fill(); g.restore()
            if (!lista(im)) return
            g.save()
            g.translate(a.x, a.y)
            if (a.dir < 0) g.scale(-1, 1)
            g.drawImage(im, a.cuadro * W, 0, W, H, -ax, -ay + respira, W, H)
            g.restore()
          },
        })
      }
    }
    for (const o of TAPAS) items.push({ base: o.base, f: () => lista(img[o.img]) && g.drawImage(img[o.img], o.x, o.y) })
    items.sort((a, b) => a.base - b.base)
    for (const it of items) it.f()
  }

  const decir = null
  return { act, encolar, tick, pasear, dibujar, cabeza, ir, esperar, hacer, sentarse, DESTINOS, caminantes: CAMINANTES }
}
