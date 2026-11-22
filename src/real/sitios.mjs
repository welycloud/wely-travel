/**
 * Scraping del sitio oficial de cada aerolínea (solo Node, en tu computador).
 *
 * Abre el buscador de la aerolínea en un navegador VISIBLE (Edge o Chrome instalados), arma la búsqueda
 * (con la URL de resultados o llenando el formulario, según el sitio), espera los resultados y lee el
 * texto de la página. No esconde la automatización ni resuelve captchas: si el sitio bloquea la
 * consulta, el agente lo informa y usa Google Flights (SerpApi) como respaldo.
 *
 * Cómo busca cada sitio (verificado el 21-nov-2026):
 *   SKY       URL de resultados  initial-sale.skyairline.com/es/chile?origin=…&departureDate=…
 *   JetSMART  formulario en jetsmart.com/cl/es (la búsqueda no queda en la URL)
 *   LATAM     URL de resultados  latamairlines.com/cl/es/ofertas-vuelos?…  (hoy bloquea la consulta automática)
 *   Copa      URL de resultados  shopping.copaair.com/?…  (por confirmar)
 *   Iberia    formulario en iberia.com/cl (por confirmar)
 * Las URLs y textos están en config.sitios.json, para corregirlos sin tocar código.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('../..', import.meta.url))
const BLOQUEO = /access denied|forbidden|captcha|are you a robot|verify you are human|unusual traffic|tardando m[aá]s de lo normal|request unsuccessful|incapsula|perimeterx|px-captcha|attention required|acceso denegado/i
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export async function plantillas() {
  try { return JSON.parse(await readFile(`${RAIZ}config.sitios.json`, 'utf8')) } catch { return {} }
}

function armarUrl(tpl, b) {
  const rt = b.tipo === 'ida_vuelta'
  const v = {
    origen: b.origen, destino: b.destino, ida: b.fechaIda, vuelta: b.fechaVuelta || '', adultos: b.adultos, ninos: b.ninos || 0,
    tipoLatam: rt ? 'RT' : 'OW', tipoSky: rt ? 'RT' : 'OW', idaVuelta: rt ? 'true' : 'false',
    cabinaLatam: { economica: 'Economy', premium: 'Premium Economy', business: 'Business' }[b.clase] || 'Economy',
    vueltaLatam: rt ? `${b.fechaVuelta}T12:00:00.000Z` : 'null',
  }
  let url = tpl.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(v[k] ?? ''))
  if (!rt) url = url.replace(/[&?](arrivalDate|date2)=[^&]*/g, '')
  return url
}

// ------------------------------------------------------------------ lectura del texto de resultados
const HORA = /^(?:([01]?\d|2[0-3]):([0-5]\d))(?:\s*\+1)?$|^([01]?\d|2[0-3]):([0-5]\d)\b/
function precioDe(lineas, desde, hasta) {
  let candidato = null
  for (let k = desde; k < hasta; k++) {
    const l = lineas[k], sig = lineas[k + 1] || ''
    const junto = `${l} ${/^[\d.,]+$/.test(sig) ? sig : ''}`
    let m = /(?:USD|US\$)\s*([\d.,]+)/i.exec(junto)
    if (m) { const v = parseFloat(m[1].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); if (v > 20) candidato = { usd: v, clp: false } }
    m = /(?:CLP\s*\$?|\$)\s*(\d{1,3}(?:\.\d{3})+)(?!\d)/.exec(junto)
    if (m) { const v = parseInt(m[1].replace(/\./g, ''), 10); if (v > 10000) candidato = { usd: v / (+process.env.CLP_POR_USD || 950), clp: true } }
    // "Tarifa desde" manda sobre precios de club o descuentos anteriores
    if (candidato && /tarifa desde|precio base|desde/i.test(lineas[k - 1] || '')) return candidato
  }
  return candidato
}
export function leerVuelos(texto) {
  const lineas = texto.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const idxHoras = []
  lineas.forEach((l, i) => { const m = HORA.exec(l); if (m && l.length <= 9) idxHoras.push([i, +(m[1] ?? m[3]) * 60 + +(m[2] ?? m[4]), /\+1/.test(l) || /^\+1$/.test(lineas[i + 1] || '')]) })
  const vuelos = []
  for (let n = 0; n + 1 < idxHoras.length; n++) {
    const [i, sale] = idxHoras[n], [j, llega, mas1] = idxHoras[n + 1]
    if (j - i > 10) continue
    const fin = idxHoras[n + 2] ? Math.min(idxHoras[n + 2][0], j + 18) : j + 18
    const precio = precioDe(lineas, j + 1, Math.min(fin, lineas.length))
    if (!precio) continue
    const tramo = lineas.slice(i, j + 1).join(' ')
    const dur = /(\d{1,2})\s*h\s*(\d{1,2})?\s*(?:m|min)?/i.exec(tramo)
    const esc = /(\d)\s*(escala|parada|stop)/i.exec(tramo)
    vuelos.push({
      linea: i, salida: sale, llegada: llega, dias: mas1 || llega < sale ? 1 : 0,
      escalas: /directo|nonstop|sin escalas/i.test(tramo) || /directo/i.test(lineas[i - 1] || '') ? 0 : esc ? +esc[1] : /con escala/i.test(lineas[i - 1] || '') ? 1 : 0,
      duracion: dur ? +dur[1] * 60 + (+dur[2] || 0) : ((llega - sale + 1440) % 1440),
      precio: Math.round(precio.usd), clp: precio.clp,
    })
    n++ // el par ya se usó
  }
  return vuelos
}
// Separa ida y vuelta cuando el sitio muestra las dos listas en la misma página
function separar(texto) {
  const m = /selecciona (?:el|tu) vuelo de vuelta|vuelo de regreso|\bVUELTA\b\s*\n.*\(/i.exec(texto)
  if (!m) return { ida: texto, vuelta: '' }
  return { ida: texto.slice(0, m.index), vuelta: texto.slice(m.index) }
}

// ------------------------------------------------------------------ formularios
async function elegirEnLista(page, campo, codigo) {
  await page.getByPlaceholder(campo, { exact: true }).first().click()
  await page.keyboard.type(codigo, { delay: 60 })
  await page.waitForTimeout(1200)
  // la opción con el código IATA exacto
  const opcion = page.locator(`text=/^\\s*${codigo}\\s*$/`).first()
  if (await opcion.count()) {
    const fila = opcion.locator('xpath=ancestor::*[self::li or self::button or self::a or self::div][1]')
    await (await fila.count() ? fila : opcion).click()
  } else {
    await page.getByText(new RegExp(`\\(${codigo}\\)`)).first().click()
  }
  await page.waitForTimeout(700)
}
// Calendario de dos meses: busca el encabezado "Mes Año" y hace clic en el día dentro de ese bloque
async function elegirDia(page, fecha) {
  const d = new Date(fecha + 'T12:00:00')
  const titulo = `${MESES[d.getMonth()]} ${d.getFullYear()}`
  for (let intento = 0; intento < 14; intento++) {
    const ok = await page.evaluate(({ titulo, dia }) => {
      const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const cab = [...document.querySelectorAll('*')].find((e) => e.children.length <= 2 && norm(e.textContent) === titulo && e.offsetParent)
      if (!cab) return false
      let bloque = cab.parentElement
      for (let k = 0; k < 4 && bloque; k++, bloque = bloque.parentElement) {
        const celdas = [...bloque.querySelectorAll('*')].filter((e) => !e.children.length && e.offsetParent && /^0?\d{1,2}$/.test(e.textContent.trim()) && +e.textContent.trim() === dia)
        if (celdas.length) { celdas[0].click(); return true }
      }
      return false
    }, { titulo, dia: d.getDate() })
    if (ok) { await page.waitForTimeout(600); return true }
    // avanzar el calendario
    const sig = page.locator('[aria-label*="iguiente" i], [class*="next" i], button:has-text("›"), button:has-text(">")').first()
    if (!(await sig.count())) return false
    await sig.click().catch(() => {})
    await page.waitForTimeout(500)
  }
  return false
}
const FORMULARIOS = {
  async jetsmart(page, b, ctx) {
    if (b.tipo !== 'ida_vuelta') await page.getByText('Solo ida', { exact: true }).first().click().catch(() => {})
    await elegirEnLista(page, 'Origen', b.origen)
    await elegirEnLista(page, 'Destino', b.destino)
    if (!(await elegirDia(page, b.fechaIda))) throw new Error('no pude elegir la fecha de ida')
    if (b.tipo === 'ida_vuelta' && !(await elegirDia(page, b.fechaVuelta))) throw new Error('no pude elegir la fecha de vuelta')
    if (b.adultos > 1 || b.ninos) {
      await page.locator('text=/pasajero/i').first().click().catch(() => {})
      for (let i = 1; i < b.adultos; i++) await page.locator('xpath=//*[normalize-space()="Adultos"]/following::*[normalize-space()="+"][1]').first().click().catch(() => {})
      await page.getByText('Confirmar', { exact: false }).first().click().catch(() => {})
    }
    ctx.log('JetSMART: formulario listo, buscando')
    await page.getByText('Buscar SMART', { exact: false }).first().click()
  },
  async iberia(page, b, ctx) {
    await page.getByRole('button', { name: /rechazar|configuraci/i }).first().click({ timeout: 3000 }).catch(() => {})
    await elegirEnLista(page, 'Destino', b.destino)
    if (!(await elegirDia(page, b.fechaIda))) throw new Error('no pude elegir la fecha de ida')
    if (b.tipo === 'ida_vuelta' && !(await elegirDia(page, b.fechaVuelta))) throw new Error('no pude elegir la fecha de vuelta')
    ctx.log('Iberia: formulario listo, buscando')
    await page.getByRole('button', { name: /^buscar$/i }).first().click()
  },
}

// ------------------------------------------------------------------ agente
export async function scrapear(aero, b, ctx) {
  const cfg = (await plantillas())[aero]
  if (process.env.SCRAPING === 'off') return { estado: 'omitido', motivo: 'Scraping desactivado (SCRAPING=off)' }
  if (!cfg?.url) return { estado: 'sin_plantilla', motivo: 'Falta la URL de búsqueda en config.sitios.json' }
  let chromium
  try { ({ chromium } = await import('playwright')) } catch { return { estado: 'sin_playwright', motivo: 'Playwright no está instalado (npm install)' } }
  const url = cfg.formulario ? cfg.url : armarUrl(cfg.url, b)
  ctx.log(`Abriendo ${new URL(url).hostname}`)
  let browser
  try {
    for (const channel of [process.env.NAVEGADOR || 'msedge', 'chrome', undefined]) {
      try { browser = await chromium.launch({ headless: false, channel }); break } catch {}
    }
    if (!browser) return { estado: 'sin_navegador', motivo: 'No encontré Edge ni Chrome instalados' }
    const page = await browser.newPage({ locale: 'es-CL', viewport: { width: 1280, height: 860 } })
    let bloqueado = false
    page.on('response', (r) => { if (r.status() === 403 && !['image', 'stylesheet', 'font'].includes(r.request().resourceType()) && /search|offer|flight|avail|vuelo|booking/i.test(r.url())) bloqueado = true })
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    if (cfg.formulario) {
      ctx.progreso(20, 'Llenando el formulario del sitio')
      await page.waitForTimeout(2500)
      await FORMULARIOS[aero](page, b, ctx)
    }
    ctx.progreso(35, 'Esperando los resultados del sitio')
    const espera = (cfg.esperaSeg || 30) * 1000, t0 = Date.now()
    let texto = ''
    while (Date.now() - t0 < espera) {
      await page.waitForTimeout(2500)
      texto = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
      if (bloqueado || BLOQUEO.test(texto)) break
      if (cfg.listo && new RegExp(cfg.listo, 'i').test(texto)) { await page.waitForTimeout(2500); texto = await page.evaluate(() => document.body.innerText); break }
    }
    if (bloqueado || BLOQUEO.test(texto)) return { estado: 'bloqueado', motivo: 'El sitio bloqueó la consulta automática' }
    const partes = separar(texto)
    const idas = leerVuelos(partes.ida)
    const vueltas = partes.vuelta ? leerVuelos(partes.vuelta) : []
    if (!idas.length) return { estado: 'sin_lectura', motivo: 'No pude leer vuelos en la página' }
    return { estado: 'ok', idas, vueltas, url: page.url(), notas: cfg.notas || '' }
  } catch (e) {
    return { estado: 'error', motivo: `Error en el sitio: ${String(e.message).split('\n')[0].slice(0, 90)}` }
  } finally {
    await browser?.close().catch(() => {})
  }
}
