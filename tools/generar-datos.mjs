/**
 * generar-datos.mjs — migración one-shot del WXR de WordPress a `datos.js`.
 *
 * Lee `uploads/playconcert.WordPress.<fecha>.xml` (export de contenidos.vip/eventos)
 * y escribe `datos.js` con el catálogo real: recitales + fichas de banda.
 *
 * Se corre a mano cuando se vuelve a exportar de WordPress:
 *     node tools/generar-datos.mjs
 *
 * Qué saca de dónde:
 *  - Recital  = post con post_format `post-format-video`, idioma `ar` (Español).
 *               El <video> del cuerpo trae el poster y los <source> (1080 / SD);
 *               la columna derecha trae género / locación / lugar / año;
 *               la izquierda, las reseñas de prensa y las recomendaciones.
 *  - Banda    = post con categoría `artista`, idioma `ar`.
 *               El <img> del cuerpo es LA foto de la banda (única fuente de
 *               imágenes reales del export: los `poster` de los videos vienen
 *               en "#" y los `_thumbnail_id` apuntan a adjuntos que el WXR no
 *               incluye). Por eso cada recital hereda la foto de su banda.
 *  - Las URLs de contenidos.vip dan 404; el que sirve los archivos es el
 *    CloudFront del plugin de S3 (ver CDN_ORIGEN). `descargar-imagenes.mjs`
 *    las baja a assets/img/artistas/.
 *
 * Lo editorial (hero de la semana, "¡Vino a Argentina!", Cine & música) NO sale
 * de acá: todavía no existe como categoría en WordPress y vive en `editorial.js`.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CDN_ORIGEN = "https://dsvfqnf1ocz8d.cloudfront.net";
const IDIOMA = "ar"; // el export trae ar (Español) y cl (Chile); maquetamos el ar

/* Los dos "Live from Abbey Road" son compilados sin post de banda: no hay foto
   propia en el export, así que van con la imagen genérica de concierto del sitio. */
const IMG_GENERICA =
  "https://contenidos.vip/eventos/wp-content/uploads/sites/17/2024/01/alternative-onerepublic-pop-pop-rock-wallpaper-preview.jpg";

/* Bandas cuyo nombre en el recital no coincide literal con el título del post. */
const ALIAS_BANDA = {
  "electric light orchestra (elo)": "Electric Light Orchestra",
};

/* El video placeholder que WordPress dejó en los recitales todavía sin archivo. */
const VIDEO_PLACEHOLDER = /playtown-app\.s3\.[^/]+\/recitales\/(OneRepublic|MileyCyrus)\.mp4/;

const PALETA = ["#FF7BA9", "#FFD84D", "#8FCFE8", "#77D6A4", "#B79CED"];

/* ---------------------------------------------------------------- utilidades */

const sinTildes = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");

const slug = (s) =>
  sinTildes(s)
    .toLowerCase()
    .replace(/[’'"“”]/g, "")
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const clave = (s) => sinTildes(s).toLowerCase().replace(/[^a-z0-9]/g, "");

const entidades = (s) =>
  (s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/gi, "’")
    .replace(/&amp;/g, "&");

const texto = (html) =>
  entidades(String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .trim();

/** contenidos.vip devuelve 404: los archivos los sirve el CloudFront del plugin S3. */
const aCdn = (url) =>
  String(url || "").replace(
    /^https?:\/\/(?:contenidos\.vip\/eventos\/wp-content\/uploads|dsvfqnf1ocz8d\.cloudfront\.net)/,
    CDN_ORIGEN
  );

/* --------------------------------------------------------------- parseo WXR */

function leerExport() {
  const dir = join(RAIZ, "uploads");
  const archivo = readdirSync(dir)
    .filter((f) => f.endsWith(".xml"))
    .sort()
    .pop();
  if (!archivo) throw new Error("No hay ningún .xml en uploads/");
  return { archivo, xml: readFileSync(join(dir, archivo), "utf8") };
}

/** Devuelve los <item> del WXR ya desmenuzados en campos crudos. */
function items(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, bloque]) => {
    const uno = (re) => (bloque.match(re) || [, ""])[1];
    const taxonomias = {};
    for (const [, dominio, nicename, nombre] of bloque.matchAll(
      /<category domain="([^"]+)" nicename="([^"]+)"><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g
    )) {
      (taxonomias[dominio] ||= []).push({ slug: nicename, nombre: entidades(nombre) });
    }
    return {
      titulo: entidades(uno(/<title>([\s\S]*?)<\/title>/)),
      nombre: uno(/<wp:post_name><!\[CDATA\[([\s\S]*?)\]\]><\/wp:post_name>/),
      wpId: Number(uno(/<wp:post_id>(\d+)<\/wp:post_id>/)),
      fecha: uno(/<wp:post_date>([\s\S]*?)<\/wp:post_date>/),
      estado: uno(/<wp:status><!\[CDATA\[([\s\S]*?)\]\]><\/wp:status>/),
      cuerpo: uno(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/),
      taxonomias,
    };
  });
}

const idiomaDe = (it) => (it.taxonomias.language || [])[0]?.slug || "";
const esRecital = (it) =>
  (it.taxonomias.post_format || []).some((t) => t.slug === "post-format-video");
const esBanda = (it) => (it.taxonomias.category || []).some((t) => t.slug === "artista");

/* ------------------------------------------------------- extracción de campos */

/** "Queen – We Will Rock You" → { artista: "Queen", show: "We Will Rock You" } */
function partirTitulo(titulo) {
  const m = titulo.match(/^(.*?)\s+[–—-]\s+(.*)$/);
  return m
    ? { artista: m[1].trim(), show: m[2].trim() }
    : { artista: titulo.trim(), show: titulo.trim() };
}

/**
 * La columna angosta del post: "Género musical: … Locación: … Lugar: … Año: …".
 * El maquetado de WordPress varía entre posts (la etiqueta a veces está dentro
 * del <strong> junto con el valor, a veces sin <strong>, y "Lugar" falta seguido),
 * así que aplanamos esa columna a texto y leemos línea por línea.
 */
function ficha(cuerpo) {
  const columnas = [...cuerpo.matchAll(/<div class="wp-block-column"[\s\S]*?(?=<!-- \/wp:column|<\/div>\s*<\/div>|$)/g)]
    .map((m) => m[0])
    .filter((c) => /Género musical/i.test(c));
  const plano = texto(columnas.join("\n") || cuerpo);
  const dato = (etiqueta) => {
    const m = plano.match(new RegExp(`(?:${etiqueta})\\s*:\\s*([^\\n]*)`, "i"));
    return m ? m[1].replace(/^[:\s]+/, "").trim() : "";
  };
  return {
    genero: dato("Género musical"),
    loc: dato("Locación|Locacion|País|Pais"),
    lugar: dato("Lugar"),
    anio: dato("Año|Ano|Fecha").match(/\d{4}/)?.[0] || "",
  };
}

/** Reseñas de prensa: "Medio: "cita" Fuente: [Medio]" separadas por <br /><br />. */
function resenas(cuerpo) {
  const bloque = cuerpo.match(/<strong>\s*Reseñas\s*<\/strong>\s*:?([\s\S]*?)(?:<hr|<\/p>)/i);
  if (!bloque) return [];
  return texto(bloque[1])
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((p) => {
      const limpio = p.replace(/\s*Fuente:\s*\[[^\]]*\]\s*$/i, "").trim();
      const m = limpio.match(/^([^:]{2,40}):\s*(.*)$/s);
      return m
        ? { medio: m[1].trim(), texto: m[2].replace(/^["“]|["”]$/g, "").trim() }
        : { medio: "", texto: limpio };
    })
    .filter((r) => r.texto.length > 40);
}

/**
 * "Recomendaciones:" — otros recitales del catálogo con el porqué escrito a mano.
 * Vienen de dos formas según la época del post: el shortcode
 * `[shortcode_recomendacion post_id="533" texto_custom="…"]`, o el título del
 * recital seguido de su párrafo.
 */
function recomendaciones(cuerpo, porTitulo, porWpId) {
  const bloque = cuerpo.match(/<strong>\s*Recomendaciones:?\s*<\/strong>([\s\S]*?)<\/p>/i);
  if (!bloque) return [];
  const crudo = entidades(bloque[1]);

  const shortcodes = [...crudo.matchAll(/\[shortcode_recomendacion\s+post_id="(\d+)"\s+texto_custom="([^"]*)"/g)]
    .map(([, id, porque]) => ({ slug: porWpId.get(Number(id)), porque: porque.trim() }))
    .filter((r) => r.slug);
  if (shortcodes.length) return shortcodes;

  const lineas = texto(bloque[1]).split("\n").map((l) => l.trim()).filter(Boolean);
  const salida = [];
  for (let i = 0; i < lineas.length; i++) {
    const ref = porTitulo.get(clave(lineas[i]));
    if (ref) salida.push({ slug: ref, porque: (lineas[i + 1] || "").trim() });
  }
  return salida;
}

/** Los <source> del <video>, ordenados de mejor a peor calidad. */
function fuentes(cuerpo) {
  return [...cuerpo.matchAll(/<source[^>]*src="([^"]+)"[^>]*?(?:size="(\d+)")?[^>]*\/?>/g)]
    .map(([etiqueta, src]) => ({
      src: entidades(src),
      calidad: Number((etiqueta.match(/size="(\d+)"/) || [, 0])[1]) || 0,
    }))
    .sort((a, b) => b.calidad - a.calidad);
}

/** Ficha de banda: foto, años de actividad, miembros y biografía. */
function datosBanda(cuerpo) {
  const seccion = (etiqueta) => {
    const re = new RegExp(`<h5>\\s*(?:${etiqueta})[^<]*</h5>\\s*([\\s\\S]*?)(?:<h5|<!--|</div>)`, "i");
    const m = cuerpo.match(re);
    return m ? texto(m[1]) : "";
  };
  return {
    img: aCdn((cuerpo.match(/<img[^>]*src="([^"]+)"/) || [, ""])[1]),
    actividad: seccion("Años de actividad|Formado en"),
    miembros: seccion("Miembros de la banda")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(.*?)\s*[–—-]\s*(.*)$/);
        return m ? { nombre: m[1].trim(), rol: m[2].trim() } : { nombre: l, rol: "" };
      }),
    bio: seccion("Biografia|Biografía").replace(/\s*\n\s*/g, " ").trim(),
  };
}

/* --------------------------------------------------------------------- build */

const { archivo, xml } = leerExport();
const todos = items(xml).filter((it) => idiomaDe(it) === IDIOMA);

// 1) Bandas. El export trae Queen dos veces: nos quedamos con la ficha más completa.
const bandas = [];
const porSlug = new Map();
for (const it of todos.filter(esBanda)) {
  const d = datosBanda(it.cuerpo);
  const ficha = {
    slug: slug(it.titulo),
    nombre: it.titulo,
    wpId: it.wpId,
    img: d.img,
    actividad: d.actividad,
    miembros: d.miembros,
    bio: d.bio,
    recitales: [],
  };
  const peso = (b) => (b.img ? 4 : 0) + (b.bio ? 2 : 0) + (b.miembros.length ? 1 : 0);
  const previa = porSlug.get(ficha.slug);
  if (!previa) {
    porSlug.set(ficha.slug, ficha);
    bandas.push(ficha);
  } else if (peso(ficha) > peso(previa)) {
    Object.assign(previa, ficha, { recitales: previa.recitales });
  }
}
const porNombre = new Map(bandas.map((b) => [clave(b.nombre), b]));

// 2) Recitales
// Las recomendaciones apuntan al recital por título o por post_id de WordPress.
const crudos = todos.filter(esRecital);
const porTitulo = new Map(crudos.map((it) => [clave(it.titulo), slug(it.titulo)]));
const porWpId = new Map(crudos.map((it) => [it.wpId, slug(it.titulo)]));

const recitales = crudos.map((it, i) => {
  const { artista, show } = partirTitulo(it.titulo);
  const f = ficha(it.cuerpo);
  const src = fuentes(it.cuerpo);
  const banda = porNombre.get(clave(ALIAS_BANDA[artista.toLowerCase()] || artista)) || null;
  const cats = (it.taxonomias.category || []).filter((c) => c.slug !== "sin-categoria");
  const s = slug(it.titulo);

  if (banda) banda.recitales.push(s);

  return {
    slug: s,
    wpId: it.wpId,
    titulo: it.titulo,
    artista,
    bandaSlug: banda ? banda.slug : "",
    show,
    genero: f.genero || cats[0]?.nombre || "Varios",
    loc: f.loc,
    lugar: f.lugar,
    anio: f.anio,
    cats: cats.map((c) => c.nombre),
    img: aCdn(banda?.img || IMG_GENERICA),
    color: PALETA[i % PALETA.length],
    pendiente: src.every((x) => VIDEO_PLACEHOLDER.test(x.src)),
    fuentes: src,
    resenas: resenas(it.cuerpo),
    recomendaciones: recomendaciones(it.cuerpo, porTitulo, porWpId),
  };
});

/* -------------------------------------------------------------------- salida */

const j = (v) => JSON.stringify(v, null, 1).replace(/\n/g, "\n ");
const salida = `// Generado por tools/generar-datos.mjs desde uploads/${archivo}
// NO editar a mano: se pisa en la próxima corrida. El contenido editorial
// (hero de la semana, "¡Vino a Argentina!", Cine & música) vive en editorial.js.

export const recitales = ${j(recitales)};

export const bandas = ${j(bandas)};

export const bandaDe = (s) => bandas.find((b) => b.slug === s) || null;
export const recitalDe = (s) => recitales.find((r) => r.slug === s) || null;
export const recitalesDe = (bandaSlug) => recitales.filter((r) => r.bandaSlug === bandaSlug);
`;

writeFileSync(join(RAIZ, "datos.js"), salida);

const sinBanda = recitales.filter((r) => !r.bandaSlug);
console.log(`datos.js — ${recitales.length} recitales, ${bandas.length} bandas`);
console.log(`  sin video real (pendiente): ${recitales.filter((r) => r.pendiente).length}`);
console.log(`  sin ficha de banda: ${sinBanda.length}${sinBanda.length ? " → " + sinBanda.map((r) => r.titulo).join(", ") : ""}`);
console.log(`  sin reseñas: ${recitales.filter((r) => !r.resenas.length).length}`);
console.log(`  bandas sin foto: ${bandas.filter((b) => !b.img).length}`);
