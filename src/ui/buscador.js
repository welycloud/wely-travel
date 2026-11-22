/**
 * Panel del buscador de WELY Travel: formulario con los filtros típicos, estado de la búsqueda,
 * terminal con el registro del código madre y la ventana con las 3 mejores propuestas.
 *
 * También es el puente con la sala: guarda el estado de cada agente (window.snEstado) y reenvía
 * cada evento del código madre como 'sn:evento', igual que espera la escena.
 */
import './buscador.css'
import { ejecutarBusqueda, AGENTES } from '../nucleo/madre.js'
import { lanzarEnNavegador } from '../nucleo/lanzador-navegador.js'
import { AEROPUERTOS, ORIGENES, AEROLINEAS, fmtUSD, fmtDur } from '../nucleo/datos.js'
import { EQUIPO } from '../sala/equipo.js'

const NOMBRE_AERO = Object.fromEntries(Object.entries(AEROLINEAS).map(([k, v]) => [k, v.nombre]))
const S = {
  agentes: AGENTES.map((a) => ({ id: a.estacion, nombre: EQUIPO[a.estacion].nombre, rol: EQUIPO[a.estacion].modulo, archivo: `agentes/${a.id}.js` })),
  st: {}, corriendo: false, cola: [], actual: null, ultima: null, sel: null,
  busqueda: null, comparador: [], torre: null, resultado: null, aeropuerto: (c) => AEROPUERTOS[c],
}
const $ = (s, r = document) => r.querySelector(s)
const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const hh = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fecha = (f) => { const d = new Date(f + 'T12:00:00'); return `${d.getDate()} ${MESES[d.getMonth()]}` }
const isoEn = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10)
const REGION = { chile: 'Chile', sudamerica: 'Sudamérica', norte: 'Norte, Centroamérica y Caribe', europa: 'Europa', oceania: 'Oceanía' }

let MODO = 'demo' // 'real' cuando corre con server/servidor.mjs
async function detectarModo() {
  try {
    const r = await fetch('./api/estado', { cache: 'no-store' })
    if (r.ok && (await r.json()).real) MODO = 'real'
  } catch {}
  const m = $('#wb-modo')
  if (m) { m.textContent = MODO === 'real' ? '● DATOS REALES' : '● DEMO SIMULADA'; m.className = `wb-modo ${MODO}` }
}
function buscarReal(b) {
  const es = new EventSource(`./api/buscar?b=${encodeURIComponent(JSON.stringify(b))}`)
  es.onmessage = (e) => { const ev = JSON.parse(e.data); if (ev.type === 'FIN_STREAM') es.close(); else emitir(ev) }
  es.onerror = () => { es.close(); if (S.corriendo) { S.corriendo = false; estado('Se perdió la conexión con el servidor local.', 'mal'); pintarEstado() } }
}

export function pct(id) {
  const s = S.st[id]
  if (!s) return 0
  if (s.estado === 'success') return 1
  if (s.estado !== 'working') return 0
  return Math.min(0.99, s.pct || 0)
}

function emitir(ev) {
  const st = S.st
  switch (ev.type) {
    case 'RUN_STARTED':
      S.corriendo = true; S.cola = ev.cola; S.busqueda = ev.busqueda; S.comparador = []; S.torre = null; S.resultado = null; S.ultima = null
      for (const a of S.agentes) st[a.id] = { estado: ev.cola.includes(a.id) ? 'queued' : 'idle', msg: '' }
      break
    case 'AGENT_TRIGGERED':
      st[ev.agent] = { estado: 'working', inicio: ev.ts, pct: 0, msg: 'Iniciando…' }
      S.actual = ev.agent
      break
    case 'BUILD_PROGRESS':
      if (st[ev.agent]) Object.assign(st[ev.agent], { pct: ev.pct, msg: ev.msg })
      break
    case 'BUILD_COMPLETE': {
      const r = ev.resultado
      let resumen = ''
      if (r?.aerolinea) {
        resumen = r.ofertas.length ? `${r.ofertas.length} opciones · desde ${fmtUSD(r.ofertas[0].total)}${r.fuente ? ` · ${r.fuente}` : ''}` : r.motivo
        if (r.ofertas.length) S.comparador = [...S.comparador.filter((c) => c.nombre !== r.nombre), { nombre: r.nombre, min: r.ofertas[0].total }]
      } else if (r?.requisitos) resumen = `${r.requisitos.length} requisitos para ${r.pais}`
      else if (r?.porAerolinea) { resumen = `Comparador con ${r.total} vuelos`; S.torre = r }
      else if (r?.propuestas) resumen = `${r.propuestas.length} propuestas listas`
      st[ev.agent] = { ...(st[ev.agent] || {}), estado: ev.status === 'skipped' ? 'skipped' : ev.status, msg: ev.reason || resumen, resumen, dur: ev.durationSec, resultado: r }
      break
    }
    case 'RUN_FINISHED':
      S.corriendo = false; S.actual = null; S.ultima = { exitCode: ev.exitCode }
      if (ev.errores) estado(`⚠ ${ev.errores.join(' · ')}`, 'mal')
      if (ev.resultado) { S.resultado = ev.resultado; setTimeout(() => mostrarResultados(ev.resultado), 3200) }
      break
    case 'LOG_OUTPUT':
      terminal(ev.line, ev.agent)
      break
    case 'AGENT_SAY':
      terminal(`💬 ${EQUIPO[ev.agent]?.nombre}: ${ev.texto}`, ev.agent, 'dice')
      break
  }
  window.dispatchEvent(new CustomEvent('sn:evento', { detail: ev }))
  pintarEstado()
}

// ------------------------------------------------------------------ DOM
function opcionesAeropuertos(filtro) {
  const grupos = {}
  for (const a of Object.values(AEROPUERTOS)) if (filtro(a)) (grupos[a.region] ||= []).push(a)
  return Object.entries(grupos).map(([r, l]) => `<optgroup label="${REGION[r]}">${l.map((a) => `<option value="${a.cod}">${a.ciudad} (${a.cod})</option>`).join('')}</optgroup>`).join('')
}

export function iniciarBuscador(capa) {
  capa.innerHTML = `
  <section class="sn-dock wb">
    <div class="wb-term" id="wb-term" hidden><div class="wb-term-in" id="wb-log"></div></div>
    <div class="wb-cab">
      <b class="wb-tit">✈ Buscador de vuelos</b><span class="wb-modo" id="wb-modo"></span>
      <span class="wb-estado" id="wb-estado">Elige tu viaje y aprieta Buscar: 8 agentes trabajan en paralelo.</span>
      <i class="wb-prog"><i id="wb-prog"></i></i>
      <button class="wb-btn" id="wb-ver" disabled>Ver propuestas</button>
      <button class="wb-btn ghost" id="wb-tog" title="Registro del código madre">▴ Registro</button>
    </div>
    <form class="wb-form" id="wb-form">
      <div class="wb-seg" role="radiogroup">
        <label><input type="radio" name="tipo" value="ida_vuelta" checked><span>Ida y vuelta</span></label>
        <label><input type="radio" name="tipo" value="ida"><span>Solo ida</span></label>
      </div>
      <label class="wb-f"><span>Origen</span><select name="origen">${opcionesAeropuertos((a) => ORIGENES.includes(a.cod))}</select></label>
      <button type="button" class="wb-swap" id="wb-swap" title="Intercambiar">⇄</button>
      <label class="wb-f"><span>Destino</span><select name="destino">${opcionesAeropuertos(() => true)}</select></label>
      <label class="wb-f"><span>Ida</span><input type="date" name="fechaIda"></label>
      <label class="wb-f" id="wb-fv"><span>Vuelta</span><input type="date" name="fechaVuelta"></label>
      <label class="wb-f wb-n"><span>Adultos</span><input type="number" name="adultos" min="1" max="9" value="2"></label>
      <label class="wb-f wb-n"><span>Niños</span><input type="number" name="ninos" min="0" max="8" value="0"></label>
      <label class="wb-f"><span>Clase</span><select name="clase"><option value="economica">Económica</option><option value="premium">Premium Economy</option><option value="business">Business</option></select></label>
      <button class="wb-buscar" id="wb-buscar" type="submit">Buscar vuelos</button>
      <div class="wb-filtros">
        <label class="wb-f"><span>Escalas</span><select name="escalas"><option value="cualquiera">Cualquiera</option><option value="directo">Solo directos</option><option value="max1">Máximo 1 escala</option></select></label>
        <label class="wb-f"><span>Equipaje</span><select name="equipaje"><option value="personal">Solo artículo personal</option><option value="mano" selected>Maleta de mano</option><option value="bodega">Maleta en bodega</option></select></label>
        <label class="wb-f"><span>Salida (ida)</span><select name="horario"><option value="cualquiera">Cualquier hora</option><option value="manana">Mañana (05–12)</option><option value="tarde">Tarde (12–19)</option><option value="noche">Noche (19–05)</option></select></label>
        <label class="wb-f"><span>Duración máx.</span><select name="duracionMax"><option value="0">Sin límite</option><option value="4">4 h</option><option value="8">8 h</option><option value="12">12 h</option><option value="18">18 h</option><option value="24">24 h</option></select></label>
        <label class="wb-f wb-n2"><span>Precio máx. (USD)</span><input type="number" name="precioMax" min="0" step="50" placeholder="Sin límite"></label>
        <label class="wb-f"><span>Priorizar</span><select name="prioridad"><option value="equilibrado">Mejor equilibrio</option><option value="precio">Menor precio</option><option value="duracion">Menor duración</option></select></label>
        <div class="wb-aero"><span>Aerolíneas</span><div>${Object.entries(NOMBRE_AERO).map(([k, n]) => `<label><input type="checkbox" name="aero" value="${k}" checked><span>${n}</span></label>`).join('')}</div></div>
      </div>
    </form>
  </section>
  <div class="wr" id="wr" hidden></div>`
  const f = $('#wb-form')
  f.destino.value = 'MAD'; f.fechaIda.value = isoEn(45); f.fechaVuelta.value = isoEn(59)
  f.fechaIda.min = f.fechaVuelta.min = isoEn(0)
  f.addEventListener('change', () => { $('#wb-fv').classList.toggle('off', f.tipo.value === 'ida'); if (f.fechaVuelta.value < f.fechaIda.value) f.fechaVuelta.value = f.fechaIda.value })
  $('#wb-swap').onclick = () => {
    const o = f.origen.value, d = f.destino.value
    if (!ORIGENES.includes(d)) return estado('Por ahora los viajes salen desde aeropuertos de Chile.', 'mal')
    f.origen.value = d; f.destino.value = o
  }
  $('#wb-tog').onclick = () => { const t = $('#wb-term'); t.hidden = !t.hidden; $('#wb-tog').textContent = t.hidden ? '▴ Registro' : '▾ Registro' }
  $('#wb-ver').onclick = () => S.resultado && mostrarResultados(S.resultado)
  f.addEventListener('submit', (e) => {
    e.preventDefault()
    if (S.corriendo) return
    const b = {
      tipo: f.tipo.value, origen: f.origen.value, destino: f.destino.value, fechaIda: f.fechaIda.value,
      fechaVuelta: f.tipo.value === 'ida' ? null : f.fechaVuelta.value, adultos: +f.adultos.value || 1, ninos: +f.ninos.value || 0,
      clase: f.clase.value, escalas: f.escalas.value, equipaje: f.equipaje.value, horario: f.horario.value,
      duracionMax: +f.duracionMax.value, precioMax: +f.precioMax.value || 0, prioridad: f.prioridad.value,
      aerolineas: [...f.querySelectorAll('[name=aero]:checked')].map((x) => x.value), hoy: isoEn(0),
    }
    if (!b.aerolineas.length) return estado('Elige al menos una aerolínea.', 'mal')
    $('#wr').hidden = true
    $('#wb-log').innerHTML = ''
    if (MODO === 'real') buscarReal(b)
    else ejecutarBusqueda(b, { lanzar: lanzarEnNavegador, emitir })
  })
  window.snEstado = () => S
  window.snPct = pct
  window.snSeleccionar = (id) => { S.sel = S.sel === id ? null : id; window.sala?.enfocar(id) }
  pintarEstado()
  detectarModo()
}

function estado(txt, clase = '') { const e = $('#wb-estado'); e.textContent = txt; e.className = `wb-estado ${clase}` }
function pintarEstado() {
  const btn = $('#wb-buscar')
  if (!btn) return
  btn.disabled = S.corriendo
  btn.textContent = S.corriendo ? 'Buscando…' : 'Buscar vuelos'
  $('#wb-ver').disabled = !S.resultado?.propuestas?.length
  const ids = S.cola
  const hechos = ids.filter((id) => ['success', 'error'].includes(S.st[id]?.estado)).length
  const total = ids.length ? ids.reduce((s, id) => s + pct(id), 0) / ids.length : 0
  $('#wb-prog').style.width = `${Math.round((S.corriendo ? total : S.resultado ? 1 : 0) * 100)}%`
  if (S.corriendo) {
    const trabajando = ids.filter((id) => S.st[id]?.estado === 'working').map((id) => EQUIPO[id].nombre.replace('Agente ', ''))
    estado(`Buscando · ${hechos}/${ids.length} agentes listos${trabajando.length ? ` · en paralelo: ${trabajando.join(', ')}` : ''}`)
  } else if (S.resultado) {
    const r = S.resultado
    estado(r.propuestas.length ? `✓ ${r.analizados} combinaciones analizadas en ${r.segundos.toFixed(1)} s · ${r.propuestas.length} propuestas` : 'Sin vuelos con esos filtros. Prueba quitando alguno.', r.propuestas.length ? 'bien' : 'mal')
  }
}

function terminal(linea, agent, clase = '') {
  const log = $('#wb-log')
  if (!log) return
  const d = document.createElement('div')
  d.className = `wb-l ${clase}`
  const quien = agent ? (EQUIPO[agent]?.nombre || agent).replace('Agente ', '') : 'madre'
  d.innerHTML = `<time>${new Date().toLocaleTimeString('es-CL', { hour12: false })}</time><b>${esc(quien)}</b><span>${esc(linea)}</span>`
  log.appendChild(d)
  while (log.children.length > 300) log.firstChild.remove()
  log.scrollTop = log.scrollHeight
}

// ------------------------------------------------------------------ las 3 propuestas
function tramo(v, etiqueta) {
  if (!v) return ''
  const esc2 = v.escalas ? `${v.escalas} escala${v.escalas > 1 ? 's' : ''} (${v.camino.slice(1, -1).join(', ')})` : 'Directo'
  return `<div class="wr-tramo"><em>${etiqueta} · ${fecha(v.fecha)}</em>
    <div class="wr-hora"><b>${hh(v.salida)}</b><span>${v.camino[0]}</span></div>
    <div class="wr-linea"><i></i><small>${fmtDur(v.duracion)} · ${esc2}</small></div>
    <div class="wr-hora"><b>${hh(v.llegada)}${v.dias ? `<sup>+${v.dias}</sup>` : ''}</b><span>${v.camino.at(-1)}</span></div></div>`
}
// incluida en la tarifa · sumada al total (la pidió el usuario) · no incluida
function chipEquipaje(txt, incluida, pedida) {
  if (incluida) return `<li class="si">${txt} incluida</li>`
  if (pedida) return `<li class="suma">${txt} sumada al total</li>`
  return `<li class="no">${txt} no incluida</li>`
}
function mostrarResultados(r) {
  const b = r.busqueda
  const o = AEROPUERTOS[b.origen], d = AEROPUERTOS[b.destino]
  const pax = `${b.adultos} adulto${b.adultos > 1 ? 's' : ''}${b.ninos ? ` y ${b.ninos} niño${b.ninos > 1 ? 's' : ''}` : ''}`
  const clase = { economica: 'Económica', premium: 'Premium Economy', business: 'Business' }[b.clase]
  const cards = r.propuestas.map((p, i) => `
    <article class="wr-card ${i === 0 ? 'top' : ''}">
      <header><span class="wr-n">${i + 1}</span><span class="wr-tag">${esc(p.etiqueta)}</span></header>
      <div class="wr-aero">${esc(p.nombre)}</div>
      <div class="wr-precio"><b>${fmtUSD(p.total)}</b><span>total · ${fmtUSD(p.porAdulto)} por adulto</span></div>
      ${tramo(p.ida, 'Ida')}${p.vuelta ? tramo(p.vuelta, 'Vuelta') : b.fechaVuelta ? `<div class="wr-tramo"><em>Vuelta · ${fecha(b.fechaVuelta)}</em><small class="wr-pend">Horario de regreso: se elige al reservar</small></div>` : ''}
      <ul class="wr-chips">
        ${chipEquipaje('🎒 Mano', p.equipaje.mano, b.equipaje !== 'personal')}
        ${chipEquipaje('🧳 Bodega', p.equipaje.bodega, b.equipaje === 'bodega')}
        <li>⏱ Puntualidad ${Math.round(p.puntualidad * 100)} %</li>
      </ul>
      <ul class="wr-por">${p.razones.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      ${p.fuente || p.enlace ? `<footer class="wr-pie">${p.fuente ? `<span class="wr-fuente">Fuente: ${esc(p.fuente)}${p.convertido ? ' · convertido desde CLP' : ''}${p.estimado ? ' · vuelta estimada' : ''}${p.nota ? ` · ${esc(p.nota)}` : ''}</span>` : ''}${p.enlace ? `<a href="${esc(p.enlace)}" target="_blank" rel="noopener">Ver vuelo ↗</a>` : ''}</footer>` : ''}
    </article>`).join('')
  const doc = r.documentos, torre = r.torre
  $('#wr').innerHTML = `
    <div class="wr-caja">
      <button class="wr-x" id="wr-x" title="Cerrar">✕</button>
      <div class="wr-cab">
        <div><small>WELY Travel · Las 3 mejores propuestas</small>
          <h2>${esc(o.ciudad)} (${o.cod}) → ${esc(d.ciudad)} (${d.cod})</h2>
          <p>${fecha(b.fechaIda)}${b.fechaVuelta ? ` – ${fecha(b.fechaVuelta)}` : ' · solo ida'} · ${pax} · ${clase}</p></div>
        <div class="wr-stat"><b>${r.analizados}</b><span>combinaciones</span><b>${r.aerolineas.length}</b><span>aerolíneas</span><b>${r.segundos.toFixed(1)} s</b><span>en paralelo</span></div>
      </div>
      ${r.propuestas.length ? `<div class="wr-cards">${cards}</div>` : '<p class="wr-vacio">Ningún vuelo cumple todos los filtros. Prueba ampliando la duración, el precio máximo o las escalas.</p>'}
      <div class="wr-notas">
        <section><h4>🗺 Itinerario sugerido · Bob</h4>${r.itinerario.map((x) => `<p>${esc(x)}</p>`).join('') || '<p>—</p>'}</section>
        <section><h4>🛂 Documentos · Carolina</h4>${doc ? doc.requisitos.map((x) => `<p>• ${esc(x)}</p>`).join('') : '<p>—</p>'}</section>
        <section><h4>📡 Torre de control · Francisco</h4>${torre ? `<p>Clima: máx. ~${torre.clima.max} °C, mín. ~${torre.clima.min} °C.</p><p>${esc(torre.consejo)}</p>${torre.mercado?.otras ? `<p>Además hay ${torre.mercado.otras} vuelos de otras aerolíneas desde ${fmtUSD(torre.mercado.minOtras)}${torre.mercado.enlace ? ` · <a href="${esc(torre.mercado.enlace)}" target="_blank" rel="noopener">ver en Google Flights ↗</a>` : ''}.</p>` : ''}` : '<p>—</p>'}
          <table class="wr-tab">${r.aerolineas.map((a) => `<tr><td>${esc(a.nombre)}</td><td>${a.opciones ? `${a.opciones} op.` : '—'}</td><td>${a.min ? fmtUSD(a.min) : esc(a.motivo || '')}</td><td class="wr-src">${esc(a.fuente || '')}</td></tr>`).join('')}</table></section>
      </div>
      <p class="wr-legal">${MODO === 'real' ? 'Precios reales consultados en los sitios de las aerolíneas y en Google Flights al momento de la búsqueda; pueden cambiar al reservar. Los requisitos de entrada son orientativos.' : 'Demo ilustrativa de agentes de IA: tarifas, horarios y requisitos simulados. Sin relación con las aerolíneas mencionadas. Verifica siempre en fuentes oficiales.'}</p>
    </div>`
  $('#wr').hidden = false
  $('#wr-x').onclick = () => { $('#wr').hidden = true }
  $('#wr').onclick = (e) => { if (e.target.id === 'wr') $('#wr').hidden = true }
}
