# PLAYCONCERT — Contexto del proyecto

## Qué es

Sitio de recitales completos para Playtown (misma familia que RETOFIT y
MINDMUSIC, mismo patrón de arquitectura). El usuario entra, ve el recital
destacado de la semana, recorre bandas y géneros, y mira el show en una página
de player propia. Sin registro ni login.

Hoy corre **todo local**. Después va la integración clásica con WordPress
(`contenidos.vip/eventos`), de donde ya salió todo el contenido.

## Stack

- **Multipágina estática**: sin build, sin framework, sin dependencias.
- **CSS compartido**: `styles.css`.
- **JS compartido**: `app.js` (módulo ES; cada HTML dice qué pantalla es en
  `<body data-pagina="…">`).
- **Datos**: `datos.js`, **generado** del export WXR de WordPress. No editar a
  mano.
- **Contenido editorial**: `editorial.js`, escrito a mano (es lo único que
  todavía no existe como categoría en WordPress).
- **Imágenes**: locales en `assets/img/bandas/` (63 fotos, ~13 MB).
- **Marca**: `assets/marca/` (copias de `1x/`, el export del diseñador).
- **Videos**: siguen viniendo del CloudFront de Playtown
  (`d2puehxgy5ixh4.cloudfront.net`), no se bajan.

Para levantarlo hace falta un server HTTP (los módulos ES no cargan por
`file://`):

```bash
cd Playtown/PlayConcert && python3 -m http.server 4173
```

También está como configuración `playconcert` en `../../.claude/launch.json`.

## Archivos

| Archivo | Rol |
|---|---|
| `index.html` | Home: hero semanal, marquesina, alerta destacada, leyendas, artista de la semana, cine, históricos, latinoamérica y todo el catálogo con filtros |
| `recital.html` | `?slug=` — el player del recital + ficha, reseñas de prensa y recomendados |
| `banda.html` | `?slug=` — ficha de la banda tal como está en WordPress: foto, años de actividad, miembros, biografía y sus shows |
| `nota.html` | `?slug=` — nota de "¡Vino a Argentina!" |
| `pelicula.html` | `?slug=` — ficha de "Cine & música" |
| `app.js` | TODO el JS: datos, rotación semanal, tarjetas y el `init` de cada pantalla |
| `datos.js` | **Generado.** 66 recitales + 63 bandas del export de WordPress |
| `editorial.js` | Lo que se cambia a mano: hero semanal, curaduría de secciones, alerta y cine |
| `styles.css` | TODO el CSS: tokens, componentes y las cinco pantallas |
| `assets/marca/` | Isotipo (`iso.png`) y wordmark (`tipo.png`), copiados de `1x/` |
| `favicon.svg` | Play rosa sobre borde negro |
| `tools/generar-datos.mjs` | WXR → `datos.js` (migración one-shot, ver su cabecera) |
| `tools/descargar-imagenes.mjs` | Baja las fotos del CDN a `assets/img/bandas/` y reapunta `datos.js` |
| `uploads/*.xml` | El export de WordPress del que sale todo |
| `design_handoff_playconcert/` | El prototipo y el diseño originales |

`catalogo.js`, `support.js` y `PlayConcert.dc.html` en la raíz son copias del
prototipo (están igual dentro de `design_handoff_playconcert/prototipo/`). El
sitio no los usa.

## La marca

No hay ningún "PLAYCONCERT" escrito: en el header y en el pie va el logo real,
que son dos PNG con alfa en `assets/marca/` (copiados de `1x/`, el export del
diseñador — se dejó `1x/` como fuente y el sitio referencia su propia carpeta).

- `iso.png` (961×273) — el estadio con la onda, en degradé cian → magenta →
  naranja. Contrasta sobre claro y sobre oscuro, va tal cual siempre.
- `tipo.png` (961×57) — el wordmark, en **blanco puro** con alfa. Sobre el pie
  negro va como vino; sobre el header blanco lleva `filter: invert(1)`, que lo
  pasa a negro puro sin tocar el recorte ni pedir un segundo archivo.

El isotipo además adorna el pie (grande, centrado) y los estados vacíos
(catálogo filtrado sin resultados y 404), que si no quedaban cajas grises
peladas.

El pie es sólo la marca: se sacaron la píldora "Rediseño 2026" y los links de
Contacto / Sobre nosotros / Playtown que traía el prototipo.

## La regla de las imágenes

**Nunca un ícono donde va un recital, una banda o una película.** Toda tarjeta,
banner, fila y afiche sale con foto real. En el código eso se sostiene así:

- `foto()` en `app.js` es el **único** lugar que arma un `<img>`, y no tiene
  camino alternativo: si no hay foto queda la caja gris, nunca un dibujo.
- El generador garantiza que cada recital y cada banda tengan `img`. Si alguna
  vez faltara, `node tools/generar-datos.mjs` lo canta en la última línea.
- No hay un solo `<svg>` en el sitio: el botón de play y las estrellas están
  hechos con CSS y texto.

De dónde salen las fotos: **del post de la banda**. Es la única fuente real de
imágenes del export — los `poster` de los videos vienen en `"#"` y los
`_thumbnail_id` apuntan a adjuntos que el WXR no incluye. Por eso el recital
hereda la foto de su banda, y el player la usa como tapa antes del play.

Los dos compilados "Live from Abbey Road" no tienen post de banda: van con la
foto genérica de concierto del sitio (`varios.jpg`). Son los únicos.

## Rotación semanal

`semanaISO()` en `app.js` devuelve el número de semana ISO y con eso se elige:

- **Hero** → recorre `heroSemanal` de `editorial.js` (hoy 10 entradas → 10
  semanas antes de repetir).
- **Artista destacado** → recorre todas las bandas con al menos un show (63
  semanas).

Cambia sola todos los lunes; no hay que tocar nada. Para previsualizar otra
semana: `index.html?semana=7`.

## Datos: qué sale del WXR y cómo

`tools/generar-datos.mjs` lee `uploads/playconcert.WordPress.<fecha>.xml`:

- **Recital** = post con formato `post-format-video`, idioma `ar` (Español).
  El export trae además una versión `cl` (Chile) de casi todo; se ignora.
- **Banda** = post con categoría `artista`, idioma `ar`.
- El `<video>` del cuerpo da los `<source>` 1080p y SD; la columna angosta da
  género / locación / lugar / año; la ancha, las reseñas de prensa y las
  recomendaciones (`[shortcode_recomendacion post_id="…" texto_custom="…"]`).
- El maquetado de WordPress varía bastante entre posts (etiquetas dentro o
  fuera del `<strong>`, `Biografia` con y sin tilde, Queen cargado dos veces),
  así que el parser aplana a texto y lee por etiqueta en vez de confiar en el
  HTML.

Huecos reales del CMS que el sitio banca sin romperse:

- **5 recitales sin archivo de video** (apuntan al placeholder OneRepublic /
  MileyCyrus): salen marcados `pendiente` y el player muestra la foto de la
  banda con el aviso "Video pendiente de carga".
- **42 recitales sin "Lugar"** y 1 sin "Año": la ficha simplemente no muestra
  esa fila.
- Algún dato cargado mal en WordPress se respeta tal cual (por ejemplo Alanis
  Morissette tiene "Rock Alternativo, Folk" en el campo Locación).

Para rehacer todo desde un export nuevo:

```bash
node tools/generar-datos.mjs && node tools/descargar-imagenes.mjs
```

## Diferencias contra el prototipo

El diseño se respetó salvo en cuatro puntos, todos por la regla de las imágenes,
por el contenido real o por cómo entra en una pantalla de teléfono:

1. **Los íconos SVG se fueron.** Donde el prototipo ponía un rayo, una estrella
   o un disco sobre un color plano, ahora va la foto de la banda.
2. **"Rock en español" pasó a "Noches latinoamericanas".** De los cuatro shows
   de esa sección sólo dos cantan en castellano; Santana y The Police entran
   por el escenario, no por el idioma. Cambió el título, no el diseño.
3. **El player no usa el atributo `poster`.** Una foto cuadrada dentro de un
   video 16:9 dejaba dos franjas negras enormes, así que va una tapa propia con
   la foto a sangre y el botón de play, que se saca al arrancar. El video
   después se ve con su relación de aspecto real, sin recortar.
4. **En mobile la navegación es un `<select>`.** Los cinco links piden 372px y
   a 375px de viewport hay 343, así que se cortaban. Abajo de 768px se cambian
   por un selector que abre el picker nativo del sistema; de 768px para arriba
   los links siguen igual. Como el header pasa a medir dos filas, el alto real
   se publica en `--alto-cabecera` (`ajustarAnclas()`) y `scroll-padding-top`
   lo usa, para que el salto a un ancla no deje la sección tapada.

## Lo que falta: WordPress

Cuando se haga la integración, `editorial.js` se cae y pasa a ser contenido del
CMS:

| Hoy en `editorial.js` | Mañana en WordPress |
|---|---|
| `heroSemanal` | recitales marcados como destacados (post meta) |
| `alertas` | categoría nueva `vino-a-argentina` |
| `cine` | categoría nueva `cine-y-musica` |
| `leyendas`, `historicos`, `latinoamerica` | curaduría por tag o por post meta |

Del lado del código sólo cambia la capa que carga los datos en `app.js`; el
render de las tarjetas queda igual. Las dos categorías nuevas necesitan imagen
destacada propia en cada post — hoy la toman prestada de la banda que
referencian.
