# WELY Travel · Agentes IA que buscan tu vuelo

Una oficina de agentes de IA que buscan vuelos **en paralelo**, coordinados por un **código madre**,
conversan mientras trabajan y entregan **las 3 mejores propuestas** de forma ordenada.

Tiene dos modos:

| Modo | Cómo se abre | De dónde salen los vuelos |
|---|---|---|
| **Real** (en tu computador) | `npm run real` → http://localhost:4173 | Cada aerolínea intenta **su sitio oficial** (scraping con un navegador visible). Si el sitio bloquea la consulta o no se puede leer, usa **Google Flights vía SerpApi** filtrando esa aerolínea. Francisco y Bob consultan Google Flights para todo el mercado. |
| **Demo** (sitio estático, p. ej. Wely) | `npm run build` y subir `dist/` | Simulación creíble, sin conexión con aerolíneas. |

La sala muestra arriba del buscador **● DATOS REALES** o **● DEMO SIMULADA**. En modo real, cada propuesta indica su
fuente («Sitio oficial» o «Google Flights») y trae el botón **Ver vuelo** para reservar. No compra nada.

## El equipo

| Agente | Archivo | Qué hace |
|---|---|---|
| Capitana Wely | `src/nucleo/madre.js` | Código madre: lanza a todos, coordina y presenta el resultado |
| Agente LATAM | `src/agentes/latam.js` | Vuelos directos y conexiones por sus hubs |
| Agente SKY | `src/agentes/sky.js` | Tarifa base baja; suma maleta y equipaje de mano |
| Agente JetSMART | `src/agentes/jetsmart.js` | Low cost en Chile y Sudamérica |
| Agente Copa | `src/agentes/copa.js` | Norteamérica, Centroamérica y Caribe vía Panamá |
| Agente Iberia | `src/agentes/iberia.js` | Europa vía Madrid |
| Carolina | `src/agentes/carolina.js` | Documentos y requisitos de entrada |
| Francisco | `src/agentes/francisco.js` | Torre de control: clima, tendencia de precio y comparador |
| Bob | `src/agentes/bob.js` | Puntúa todos los vuelos y arma el top 3 con itinerario |

En modo real se usan las versiones de `src/agentes-reales/` (scraping en `src/real/sitios.mjs`, Google Flights en `src/real/serpapi.mjs`) y el servidor `server/servidor.mjs`.

Las aerolíneas comparten el motor `src/agentes/motor-aerolinea.js`; los datos de referencia
(aeropuertos, cobertura, requisitos, clima) están en `src/nucleo/datos.js`.

## Cómo trabajan

1. **En paralelo**, cada uno en su propio hilo (Web Worker): las 5 aerolíneas buscan, Carolina revisa
   documentos y Francisco prepara clima y tendencia de precio.
2. Cuando terminan las aerolíneas, el código madre le entrega todas las ofertas a Francisco, que arma el comparador.
3. Bob puntúa cada vuelo (precio, duración, escalas, puntualidad) según la prioridad elegida y elige
   tres propuestas distintas: mejor equilibrio, más económica, más rápida.

Mientras tanto, los agentes conversan con globos de diálogo basados en lo que van encontrando.

**Filtros del buscador:** ida y vuelta o solo ida, origen (aeropuertos de Chile), destino, fechas,
adultos, niños, clase, escalas, equipaje, horario de salida, duración máxima, precio máximo,
aerolíneas y prioridad.

## Modo real: configuración

1. `npm install` (instala también Playwright; usa tu Microsoft Edge o Chrome, no descarga navegadores).
2. Archivo `.env` en la raíz (plantilla: `.env.ejemplo`):
   - `SERPAPI_KEY=...` clave de serpapi.com (plan gratis: 250 búsquedas al mes).
   - `SCRAPING=off` para usar solo Google Flights (sin abrir ventanas).
   - `NAVEGADOR=chrome` para usar Chrome en vez de Edge.
3. `npm run real`.

**Consumo de SerpApi por búsqueda:** 1 (Francisco) + 1 por cada aerolínea cuyo sitio no se pudo leer + 1 por cada
propuesta de ida y vuelta (vuelo de regreso). Entre 2 y 9. Las respuestas se guardan 6 horas en `.cache/`: repetir
la misma búsqueda no gasta.

**Scraping** (configurado en `config.sitios.json`, revisado el 21-nov-2026):

| Aerolínea | Cómo busca | Estado |
|---|---|---|
| SKY | URL de resultados | Verificado: se leen horario, duración y precio |
| JetSMART | Llena el formulario del sitio | Verificado que los resultados se leen (ida y vuelta, tasas no incluidas) |
| LATAM | URL de resultados | Su sitio bloquea la consulta automática → usa Google Flights |
| Copa | URL de resultados | Por confirmar |
| Iberia | Llena el formulario del sitio | Por confirmar |

Los precios en pesos se convierten a dólares con `CLP_POR_USD` (950 por defecto, editable en `.env`). El scraping no
esconde la automatización ni resuelve captchas: si el sitio bloquea, el agente lo dice y pasa a Google Flights.

**Francisco** además revisa otras aerolíneas en Google Flights (Avianca, Aerolíneas Argentinas, etc.). Si alguna es
mejor, la suma a la competencia y puede entrar al top 3 (marcada «hallazgo de Francisco»).

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # genera dist/ (sitio estático listo para Netlify o cualquier hosting)
```

`dist/` funciona en cualquier carpeta o subruta (por ejemplo `wely.cl/travel`).

Desde la consola, el mismo código madre y los mismos agentes (cada uno en un worker_thread):

```bash
node madre-cli.mjs --origen SCL --destino CUN --ida 2027-03-10 --vuelta 2027-03-20 --adultos 2 --equipaje bodega
node madre-cli.mjs --real --destino LIM --ida 2027-01-15 --vuelta 2027-01-22   # con datos reales
node madre-cli.mjs --help   # ver la lista de filtros en el encabezado del archivo
```

## Créditos

- Oficina en pixel-art: [OpenClaw Office](https://github.com/wickedapp/openclaw-office) (MIT, WickedApp), retocada.
- Tipografías: Orbitron, Inter, JetBrains Mono y Pacifico (SIL Open Font License), incluidas localmente.
- Los nombres de aerolíneas se usan solo como texto descriptivo; no hay afiliación con ellas.
