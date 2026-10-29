/**
 * app.js — todo el JavaScript del sitio.
 *
 * Multipágina estática, sin build ni framework: cada HTML declara qué pantalla
 * es en `<body data-pagina="...">` y acá se elige el `init` correspondiente.
 *
 *   index.html     → home      (hero semanal, alerta, leyendas, artista de la
 *                               semana, cine, históricos, latinoamérica, catálogo)
 *   artistas.html  → artistas  (todas las bandas, A→Z / Z→A)
 *   recitales.html → recitales (todos los shows, por nombre o por año)
 *   generos.html   → generos   (?genero= — los shows de un género)
 *   recital.html   → recital   (?slug= — el player y la ficha del recital)
 *   banda.html     → banda     (?slug= — la ficha de la banda, como en WordPress)
 *   nota.html      → nota      (?slug= — nota de "¡Vino a Argentina!")
 *   pelicula.html  → pelicula  (?slug= — ficha de Cine & música)
 *
 * Datos: `datos.js` (generado del export de WordPress) + `editorial.js` (lo que
 * se cambia a mano cada semana). Cuando entre la API de WordPress, sólo cambia
 * la capa `cargar*()` de acá; el render queda igual.
 *
 * Regla de imágenes: TODA tarjeta o banner que represente un recital, una banda
 * o una película sale con la foto de datos.js. `foto()` es el único lugar que
 * arma ese HTML, y nunca devuelve un ícono como reemplazo.
 */

import { recitales, bandas, bandaDe, recitalDe, recitalesDe } from "./datos.js";
import {
  heroSemanal,
  leyendas,
  historicos,
  latinoamerica,
  alertas,
  cine,
} from "./editorial.js";

/* ============================================================== utilidades */

const $ = (sel, raiz = document) => raiz.querySelector(sel);

/** Escapa texto que va a interpolarse en HTML. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const param = (nombre) => new URLSearchParams(location.search).get(nombre) || "";

/** Junta valores no vacíos con un separador (para subtítulos tipo "1986, Wembley"). */
const juntar = (partes, sep = " · ") => partes.filter(Boolean).join(sep);

/**
 * Semana ISO del año. Es lo que hace rotar el hero y el artista destacado sin
 * que nadie tenga que tocar nada: cambia sola todos los lunes.
 */
export function semanaISO(fecha = new Date()) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); // al jueves de su semana
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - inicio) / 86400000 + 1) / 7);
}

/** El elemento que toca esta semana. Con `?semana=N` se puede previsualizar otra. */
function deLaSemana(lista) {
  if (!lista.length) return null;
  const forzada = Number(param("semana"));
  const n = Number.isFinite(forzada) && forzada > 0 ? forzada : semanaISO();
  return lista[(n - 1) % lista.length];
}

/* ================================================================ imágenes */

/**
 * El único armador de imágenes del sitio: devuelve el <img> que va adentro de
 * un contenedor con clase `.media` (el que le da la proporción y el recorte).
 * `alt` describe a quién se ve. Si no hubiera foto — no debería pasar: el
 * generador garantiza una para cada recital y cada banda — queda la caja gris,
 * nunca un ícono en su lugar.
 */
function foto(src, alt, { cargaAnticipada = false } = {}) {
  if (!src) return "";
  return `<img src="${esc(src)}" alt="${esc(alt)}"
    loading="${cargaAnticipada ? "eager" : "lazy"}" decoding="async"
    ${cargaAnticipada ? 'fetchpriority="high"' : ""}>`;
}

const fotoDe = (r) => foto(r.img, `${r.artista} — ${r.show}`);

/* ================================================================= enlaces */

const urlRecital = (slug) => `recital.html?slug=${encodeURIComponent(slug)}`;
const urlBanda = (slug) => `banda.html?slug=${encodeURIComponent(slug)}`;
const urlNota = (slug) => `nota.html?slug=${encodeURIComponent(slug)}`;
const urlPelicula = (slug) => `pelicula.html?slug=${encodeURIComponent(slug)}`;

/* ================================================================= tarjetas */

/** Tarjeta de recital: foto + artista + show + dónde/cuándo. */
function tarjetaRecital(r) {
  const donde = juntar([r.lugar, r.loc]) || r.genero;
  return `<a class="ficha" href="${urlRecital(r.slug)}">
    <span class="ficha__media media">
      ${foto(r.img, `${r.artista} — ${r.show}`)}
      <span class="play play--chico media__marca" aria-hidden="true"></span>
      ${r.anio ? `<span class="pildora media__marca media__marca--abajo-der">${esc(r.anio)}</span>` : ""}
    </span>
    <span class="ficha__cuerpo">
      <span class="ficha__titulo">${esc(r.artista)}</span>
      <span class="ficha__sub">${esc(r.show)}</span>
      <span class="ficha__meta">${esc(donde)}</span>
    </span>
  </a>`;
}

/** Tarjeta de banda: foto grande, género y cuántos shows tiene en el catálogo. */
function tarjetaBanda(b, estado) {
  const shows = b.recitales.length;
  const genero = recitalDe(b.recitales[0])?.genero || "Rock";
  return `<a class="ficha ficha--banda" href="${urlBanda(b.slug)}">
    <span class="ficha__media media">${foto(b.img, b.nombre)}</span>
    <span class="ficha__cuerpo">
      <span class="ficha__titulo">${esc(b.nombre)}</span>
      <span class="ficha__sub">${esc(genero)}</span>
      <span class="ficha__etiquetas">
        ${estado ? `<span class="pildora pildora--amarilla">${esc(estado)}</span>` : ""}
        <span class="pildora">${shows === 1 ? "1 show" : `${shows} shows`}</span>
      </span>
    </span>
  </a>`;
}

/* =================================================================== HOME */

function initHome() {
  pintarHero();
  pintarMarquesina();
  pintarAlerta();
  pintarLeyendas();
  pintarArtistaDestacado();
  pintarCine();
  pintarHistoricos();
  pintarLatinoamerica();
  initCatalogo();
}

/* ------------------------------------------------------------------ hero */

function pintarHero() {
  const caja = $("#hero");
  if (!caja) return;

  // Se rota sobre las entradas cuyo recital sigue existiendo en el catálogo.
  const validas = heroSemanal.filter((h) => recitalDe(h.recital));
  const h = deLaSemana(validas);
  if (!h) return caja.remove();

  const r = recitalDe(h.recital);
  const pie = juntar([r.lugar, r.loc, r.anio], " · ");
  const calidad = r.pendiente ? "Próximamente" : r.fuentes[0]?.calidad >= 1080 ? "1080p" : "SD";

  caja.innerHTML = `<div class="hero__caja">
    <div>
      <span class="pildora pildora--rosa hero__volanta">${esc(h.volanta)}</span>
      <h1 class="titulo-xl">${esc(h.titular)}</h1>
      <p class="hero__bajada">${esc(h.bajada)}</p>
      <a class="boton boton--fuerte" href="${urlRecital(r.slug)}">Ver el show</a>
    </div>
    <a class="hero__foto media media--velo" href="${urlRecital(r.slug)}"
       aria-label="Ver ${esc(r.artista)} — ${esc(r.show)}">
      ${foto(r.img, `${r.artista} — ${r.show}`, { cargaAnticipada: true })}
      <span class="play" aria-hidden="true"></span>
      <span class="pildora pildora--amarilla media__marca media__marca--arriba-izq">${esc(calidad)}</span>
      <span class="hero__pie">${esc(r.artista)} — ${esc(r.show)}<br>${esc(pie)}</span>
    </a>
  </div>`;
}

/* ------------------------------------------------------------ marquesina */

function pintarMarquesina() {
  const caja = $("#marquesina");
  if (!caja) return;

  // Se arma con lugares reales del catálogo, no con una lista escrita a mano.
  const frases = recitales
    .filter((r) => r.lugar && !/^n\/a/i.test(r.lugar) && r.anio)
    .slice(0, 12)
    .map((r) => `${r.lugar} ${r.anio}`);
  if (!frases.length) return caja.remove();

  const cinta = frases.join(" ✱ ") + " ✱ ";
  caja.innerHTML = `<div class="marquesina__cinta">
    <span>${esc(cinta)}</span><span aria-hidden="true">${esc(cinta)}</span>
  </div>`;
}

/* ------------------------------------------- banner ¡Vino a Argentina! */

function pintarAlerta() {
  const caja = $("#alerta");
  if (!caja) return;

  const a = alertas[0];
  if (!a) return caja.remove();

  // La foto sale de la banda o del recital que la nota referencia.
  const r = recitalDe(a.recital);
  const b = bandaDe(a.banda);
  const img = b?.img || r?.img;
  const nombre = b?.nombre || r?.artista || a.titulo;
  const rotulo = a.tipo === "viene" ? "¡Viene a Argentina!" : "¡Vino a Argentina!";

  caja.innerHTML = `<a class="alerta" href="${urlNota(a.slug)}">
    <span class="alerta__foto media">${foto(img, nombre)}</span>
    <span class="alerta__cuerpo">
      <span class="alerta__titulo">${esc(rotulo)}</span>
      <span class="pildora pildora--amarilla">${esc(a.anio)}</span>
      <span class="pildora">${esc(a.lugar)}</span>
      <p class="alerta__copete">${esc(a.copete)}</p>
      <span class="boton boton--chico">Leer la nota</span>
    </span>
  </a>`;
}

/* --------------------------------------------------------------- leyendas */

function pintarLeyendas() {
  const caja = $("#leyendas-grilla");
  if (!caja) return;
  caja.innerHTML = leyendas
    .map((l) => {
      const b = bandaDe(l.banda);
      return b ? tarjetaBanda(b, l.estado) : "";
    })
    .join("");
}

/* ----------------------------------------------- artista de la semana */

function pintarArtistaDestacado() {
  const caja = $("#destacado");
  if (!caja) return;

  // Rota por TODO el catálogo de bandas que tengan al menos un recital.
  const conShows = bandas.filter((b) => b.recitales.length);
  const b = deLaSemana(conShows);
  if (!b) return caja.remove();

  const r = recitalDe(b.recitales[0]);
  const donde = r ? juntar([r.lugar, r.loc, r.anio]) : "";

  caja.innerHTML = `<div class="destacado">
    <a class="destacado__foto media" href="${urlBanda(b.slug)}" aria-label="Ver ficha de ${esc(b.nombre)}">
      ${foto(b.img, b.nombre)}
    </a>
    <div style="min-width:0">
      <h3 class="titulo-m">${esc(b.nombre)}${r ? ` — ${esc(r.show)}` : ""}</h3>
      <p class="destacado__bio">${esc(b.bio)}</p>
      <div class="destacado__pie">
        ${b.actividad ? `<span class="pildora">En actividad: ${esc(b.actividad)}</span>` : ""}
        ${donde ? `<span class="pildora">${esc(donde)}</span>` : ""}
        ${r ? `<a class="boton boton--chico boton--fuerte" href="${urlRecital(r.slug)}">Ver el show</a>` : ""}
        <a class="boton boton--chico" href="${urlBanda(b.slug)}">Ficha de la banda</a>
      </div>
    </div>
  </div>`;
}

/* ---------------------------------------------------------- cine & música */

function pintarCine() {
  const caja = $("#cine-caja");
  if (!caja) return;

  const p = cine[0];
  if (!p) return caja.remove();

  const b = bandaDe(p.banda);
  const r = recitalDe(p.recital);
  const img = b?.img || r?.img;

  caja.innerHTML = `<div class="cine">
    <a class="cine__afiche media media--velo" href="${urlPelicula(p.slug)}"
       aria-label="Ver ficha de ${esc(p.titulo)}">
      ${foto(img, p.titulo)}
      <span class="pildora pildora--amarilla media__marca media__marca--abajo-der">${esc(p.anio)}</span>
    </a>
    <div style="min-width:0">
      <span class="pildora pildora--rosa">${esc(p.tipo)} ${esc(p.anio)}</span>
      <h3 class="titulo-l cine__titulo">${esc(p.titulo)}</h3>
      <p class="cine__sinopsis">${esc(p.sinopsis)}</p>
      <div class="cine__datos">
        <span class="estrellas" aria-label="${p.puntaje} de 5">${"★".repeat(p.puntaje)}${"☆".repeat(5 - p.puntaje)}</span>
        ${p.etiquetas.map((e) => `<span class="pildora">${esc(e)}</span>`).join("")}
        <a class="boton boton--chico" href="${urlPelicula(p.slug)}">Ver la ficha</a>
      </div>
    </div>
  </div>`;
}

/* -------------------------------------------------------------- históricos */

function pintarHistoricos() {
  const caja = $("#historicos-lista");
  if (!caja) return;
  caja.innerHTML = historicos
    .map((slug) => {
      const r = recitalDe(slug);
      if (!r) return "";
      const sub = juntar([r.anio, r.lugar, r.loc], ", ");
      const dato = r.lugar || r.loc || r.genero;
      return `<a class="lista__fila" href="${urlRecital(r.slug)}">
        <span class="lista__foto media">${fotoDe(r)}</span>
        <span class="lista__texto">
          <span class="lista__titulo">${esc(r.artista)} — ${esc(r.show)}</span>
          <span class="lista__sub">${esc(sub)}</span>
        </span>
        <span class="pildora pildora--celeste">${esc(dato)}</span>
      </a>`;
    })
    .join("");
}

/* --------------------------------------------------------- latinoamérica */

function pintarLatinoamerica() {
  const caja = $("#latino-grilla");
  if (!caja) return;
  caja.innerHTML = latinoamerica
    .map((h) => {
      const r = recitalDe(h.recital);
      if (!r) return "";
      return `<a class="hito" href="${urlRecital(r.slug)}">
        <span class="hito__media media media--velo">
          ${fotoDe(r)}
          <span class="hito__anio">${esc(r.anio)}</span>
        </span>
        <span class="hito__cuerpo">
          <span class="hito__titulo">${esc(h.titulo)}</span>
          <p class="hito__desc">${esc(h.desc)}</p>
        </span>
      </a>`;
    })
    .join("");
}

/* ------------------------------------------------------ catálogo + filtros */

/** Géneros musicales de la home. Las categorías de lugar del CMS (Inglaterra,
 *  Grecia…) quedan afuera a propósito: acá se filtra por música. */
const GENEROS = [
  "Todos",
  "Rock",
  "Pop",
  "Jazz",
  "Soul",
  "Folk",
  "Rap",
  "Reggae",
  "Electronica",
  "Brasilero",
  "Italiano",
];

const PASO = 12;

/** Minúsculas y sin tildes, para que "Electronica" encuentre "Electrónica". */
const plano = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Un recital es de un género si lo tiene como categoría en WordPress o si el
 * campo libre "Género" lo nombra ("Rock, Reggae Rock" también es Reggae). La
 * usan el catálogo de la home y la pantalla de géneros, así cuentan lo mismo.
 */
const coincideGenero = (r, g) =>
  g === "Todos" ||
  r.cats.some((c) => plano(c) === plano(g)) ||
  plano(r.genero).includes(plano(g));

function initCatalogo() {
  const grilla = $("#catalogo-grilla");
  const filtros = $("#catalogo-filtros");
  const masCaja = $("#catalogo-mas");
  if (!grilla) return;

  const estado = { genero: "Todos", visibles: PASO };
  const coincide = coincideGenero;

  filtros.innerHTML = GENEROS.map(
    (g) => `<button class="filtro" type="button" data-genero="${esc(g)}"
             aria-pressed="${g === estado.genero}">${esc(g)}</button>`
  ).join("");

  function pintar() {
    const filtrados = recitales.filter((r) => coincide(r, estado.genero));
    const total = $("#catalogo-total");
    if (total) {
      total.textContent =
        filtrados.length === 1 ? "1 recital disponible" : `${filtrados.length} recitales disponibles`;
    }

    grilla.innerHTML = filtrados.length
      ? filtrados.slice(0, estado.visibles).map(tarjetaRecital).join("")
      : "";
    grilla.classList.toggle("grilla", filtrados.length > 0);

    const vacio = $("#catalogo-vacio");
    if (vacio) vacio.classList.toggle("oculto", filtrados.length > 0);

    const restan = filtrados.length - estado.visibles;
    masCaja.innerHTML =
      restan > 0
        ? `<button class="boton" type="button" id="ver-mas">Ver más recitales (${restan})</button>`
        : "";

    for (const b of filtros.children) {
      b.setAttribute("aria-pressed", String(b.dataset.genero === estado.genero));
    }
  }

  filtros.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-genero]");
    if (!boton) return;
    estado.genero = boton.dataset.genero;
    estado.visibles = PASO;
    pintar();
  });

  masCaja.addEventListener("click", (e) => {
    if (!e.target.closest("#ver-mas")) return;
    estado.visibles += PASO;
    pintar();
  });

  pintar();
}

/* ============================================ LISTADOS (artistas, recitales) */

const alfabetico = (a, b) => a.localeCompare(b, "es", { sensitivity: "base" });
const nombreRecital = (r) => `${r.artista} ${r.show}`;

/**
 * Botonera de orden que comparten Artistas y Recitales. El orden elegido queda
 * en `?orden=` (con replaceState), así un link o un recargar lo respetan.
 * `ordenes` es { clave: [rótulo, comparador] }; la primera es la de entrada.
 */
function listadoOrdenable({ items, ordenes, botonera, grilla, total, tarjeta, contar }) {
  if (!grilla) return;
  const claves = Object.keys(ordenes);
  let orden = claves.includes(param("orden")) ? param("orden") : claves[0];

  botonera.insertAdjacentHTML(
    "beforeend",
    claves
      .map(
        (k) => `<button class="filtro" type="button" data-orden="${k}"
                 aria-pressed="${k === orden}">${esc(ordenes[k][0])}</button>`
      )
      .join("")
  );
  if (total) total.textContent = contar(items.length);

  function pintar() {
    grilla.innerHTML = [...items].sort(ordenes[orden][1]).map(tarjeta).join("");
    for (const b of botonera.querySelectorAll("[data-orden]")) {
      b.setAttribute("aria-pressed", String(b.dataset.orden === orden));
    }
  }

  botonera.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-orden]");
    if (!boton || boton.dataset.orden === orden) return;
    orden = boton.dataset.orden;
    const url = new URL(location.href);
    url.searchParams.set("orden", orden);
    history.replaceState(null, "", url);
    pintar();
  });

  pintar();
}

function initArtistas() {
  listadoOrdenable({
    items: bandas.filter((b) => b.recitales.length),
    ordenes: {
      "az": ["A → Z", (a, b) => alfabetico(a.nombre, b.nombre)],
      "za": ["Z → A", (a, b) => alfabetico(b.nombre, a.nombre)],
    },
    botonera: $("#artistas-orden"),
    grilla: $("#artistas-grilla"),
    total: $("#artistas-total"),
    tarjeta: (b) => tarjetaBanda(b),
    contar: (n) => (n === 1 ? "1 artista" : `${n} artistas`),
  });
}

/** Por año, y a igual año por nombre. Los que no tienen año van siempre al final. */
const porAnio = (sentido) => (a, b) => {
  if (!a.anio || !b.anio) return !a.anio - !b.anio;
  return sentido * (Number(a.anio) - Number(b.anio)) || alfabetico(nombreRecital(a), nombreRecital(b));
};

function initRecitales() {
  listadoOrdenable({
    items: recitales,
    ordenes: {
      "az": ["A → Z", (a, b) => alfabetico(nombreRecital(a), nombreRecital(b))],
      "za": ["Z → A", (a, b) => alfabetico(nombreRecital(b), nombreRecital(a))],
      "anio-asc": ["Más antiguos", porAnio(1)],
      "anio-desc": ["Más recientes", porAnio(-1)],
    },
    botonera: $("#recitales-orden"),
    grilla: $("#recitales-grilla"),
    total: $("#recitales-total"),
    tarjeta: tarjetaRecital,
    contar: (n) => (n === 1 ? "1 recital disponible" : `${n} recitales disponibles`),
  });
}

/* ================================================================ GÉNEROS */

/** Categorías del CMS que no son música: lugares y formatos. */
const NO_SON_GENEROS = ["Inglaterra", "Grecia", "Varios", "Compilado Videoclips"];

/**
 * Los géneros salen del catálogo, no de una lista escrita a mano: son las
 * categorías musicales que los recitales tienen cargadas en WordPress, de la
 * más poblada a la menos. Si mañana se carga un recital de Tango, aparece solo.
 */
function generosDelCatalogo() {
  const nombres = new Set(recitales.flatMap((r) => r.cats).filter((c) => !NO_SON_GENEROS.includes(c)));
  return [...nombres]
    .map((g) => ({ nombre: g, recitales: recitales.filter((r) => coincideGenero(r, g)) }))
    .sort((a, b) => b.recitales.length - a.recitales.length || alfabetico(a.nombre, b.nombre));
}

function initGeneros() {
  const lista = $("#generos-lista");
  const grilla = $("#generos-grilla");
  if (!grilla) return;

  const generos = generosDelCatalogo();
  if (!generos.length) return noEncontrado("Todavía no hay géneros cargados.");
  const pedido = generos.find((g) => plano(g.nombre) === plano(param("genero")));
  let actual = pedido || generos[0];

  lista.innerHTML = generos
    .map(
      (g) => `<button class="filtro" type="button" data-genero="${esc(g.nombre)}">
        ${esc(g.nombre)} <span class="filtro__cuenta">${g.recitales.length}</span>
      </button>`
    )
    .join("");

  function pintar() {
    const n = actual.recitales.length;
    $("#genero-titulo").textContent = actual.nombre;
    $("#genero-total").textContent = n === 1 ? "1 recital" : `${n} recitales`;
    grilla.innerHTML = [...actual.recitales]
      .sort((a, b) => alfabetico(nombreRecital(a), nombreRecital(b)))
      .map(tarjetaRecital)
      .join("");
    for (const b of lista.children) {
      b.setAttribute("aria-pressed", String(b.dataset.genero === actual.nombre));
    }
    document.title = `${actual.nombre} · Géneros · PlayConcert`;
  }

  lista.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-genero]");
    if (!boton) return;
    actual = generos.find((g) => g.nombre === boton.dataset.genero);
    const url = new URL(location.href);
    url.searchParams.set("genero", actual.nombre);
    history.replaceState(null, "", url);
    pintar();
  });

  pintar();
}

/* ============================================== RECITAL (player + ficha) */

function initRecital() {
  const r = recitalDe(param("slug"));
  if (!r) return noEncontrado("Ese recital no está en el catálogo.");

  const b = bandaDe(r.bandaSlug);
  document.title = `${r.artista} — ${r.show} · PlayConcert`;

  /* Player. Si el recital todavía no tiene archivo, en vez de un cuadro vacío
     va la foto de la banda con el aviso encima. */
  $("#player").innerHTML = r.pendiente
    ? `<div class="pendiente media">
         ${fotoDe(r)}
         <div class="pendiente__aviso">
           <div>
             <strong>Video pendiente de carga</strong>
             <p>Este recital está publicado como borrador en el CMS y todavía no tiene
                su archivo final subido.</p>
           </div>
         </div>
       </div>`
    : `<div class="reproductor">
         <video controls preload="metadata" playsinline>
           ${r.fuentes
             .map((f) => `<source src="${esc(f.src)}" type="video/mp4"${f.calidad ? ` data-calidad="${f.calidad}"` : ""}>`)
             .join("")}
           Tu navegador no puede reproducir este video.
         </video>
         <button class="tapa media" type="button" id="tapa"
                 aria-label="Reproducir ${esc(r.artista)} — ${esc(r.show)}">
           ${foto(r.img, `${r.artista} — ${r.show}`, { cargaAnticipada: true })}
           <span class="play" aria-hidden="true"></span>
         </button>
       </div>`;

  /* La foto de la banda tapa el video hasta que se aprieta play: así el recital
     arranca con imagen a sangre y no con las franjas negras que deja el `poster`
     de un video 16:9 sobre una foto cuadrada. */
  const tapa = $("#tapa");
  if (tapa) {
    tapa.addEventListener("click", () => {
      tapa.remove();
      $("#player video")?.play();
    });
  }

  /* Ficha del recital, con los mismos campos que el post de WordPress. */
  const calidad = r.pendiente ? "Pendiente" : r.fuentes[0]?.calidad >= 1080 ? "1080p" : "SD";
  const filas = [
    ["Año", r.anio],
    ["Género", r.genero],
    ["Locación", r.loc],
    ["Lugar", r.lugar],
    ["En actividad", b?.actividad],
  ].filter(([, v]) => v && !/^n\/a$/i.test(v));

  $("#ficha").innerHTML = `
    <div>
      <div class="datos__etiquetas">
        ${r.anio ? `<span class="pildora pildora--rosa">${esc(r.anio)}</span>` : ""}
        <span class="pildora pildora--amarilla">${esc(calidad)}</span>
        ${r.cats.map((c) => `<span class="pildora pildora--celeste">${esc(c)}</span>`).join("")}
      </div>
      <h1 class="datos__titulo">${esc(r.artista)}</h1>
      <p class="datos__show">${esc(r.show)}</p>
      <p class="datos__bio">${esc(b?.bio || `Registro en vivo de ${r.artista}. ${r.genero}.`)}</p>
    </div>
    <aside class="panel">
      <h2>Ficha del recital</h2>
      <dl style="margin:0">
        ${filas
          .map(
            ([k, v]) => `<div class="panel__fila"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`
          )
          .join("")}
      </dl>
      ${
        b
          ? `<a class="panel__banda" href="${urlBanda(b.slug)}">
               <span class="avatar media">${foto(b.img, b.nombre)}</span>
               <span>
                 <strong style="display:block;font-size:17px">${esc(b.nombre)}</strong>
                 <span style="font-size:14px;color:var(--gris)">Ver la ficha de la banda</span>
               </span>
             </a>`
          : ""
      }
    </aside>`;

  pintarResenas(r);
  pintarRelacionados(r);
}

function pintarResenas(r) {
  const caja = $("#resenas");
  const seccion = $("#resenas-seccion");
  if (!caja) return;
  if (!r.resenas.length) return seccion?.remove();

  caja.innerHTML = r.resenas
    .map(
      (x) => `<figure class="resena">
        <blockquote>“${esc(x.texto)}”</blockquote>
        ${x.medio ? `<figcaption>${esc(x.medio)}</figcaption>` : ""}
      </figure>`
    )
    .join("");
}

/**
 * "Seguí viendo": primero las recomendaciones que el editor cargó en el post
 * de WordPress (con su porqué), y si no alcanzan se completa con recitales de
 * la misma categoría.
 */
function pintarRelacionados(r) {
  const caja = $("#relacionados");
  if (!caja) return;

  const recomendados = r.recomendaciones
    .map((x) => ({ r: recitalDe(x.slug), porque: x.porque }))
    .filter((x) => x.r);

  const yaEstan = new Set([r.slug, ...recomendados.map((x) => x.r.slug)]);
  const relleno = recitales
    .filter((o) => !yaEstan.has(o.slug) && o.cats.some((c) => r.cats.includes(c)))
    .slice(0, Math.max(0, 4 - recomendados.length))
    .map((o) => ({ r: o, porque: "" }));

  const lista = [...recomendados, ...relleno];
  if (!lista.length) return $("#relacionados-seccion")?.remove();

  caja.innerHTML = lista
    .map(
      ({ r: o, porque }) => `<a class="ficha" href="${urlRecital(o.slug)}">
        <span class="ficha__media media">
          ${fotoDe(o)}
          <span class="play play--chico media__marca" aria-hidden="true"></span>
          ${o.anio ? `<span class="pildora media__marca media__marca--abajo-der">${esc(o.anio)}</span>` : ""}
        </span>
        <span class="ficha__cuerpo">
          <span class="ficha__titulo">${esc(o.artista)}</span>
          <span class="ficha__sub">${esc(porque || o.show)}</span>
        </span>
      </a>`
    )
    .join("");
}

/* ======================================================= FICHA DE BANDA */

function initBanda() {
  const b = bandaDe(param("slug"));
  if (!b) return noEncontrado("Esa banda no está en el catálogo.");

  document.title = `${b.nombre} · PlayConcert`;
  const shows = recitalesDe(b.slug);

  $("#banda").innerHTML = `<div class="banda-cabecera">
    <div class="banda-cabecera__foto media">${foto(b.img, b.nombre, { cargaAnticipada: true })}</div>
    <div style="min-width:0">
      <span class="pildora pildora--rosa">Ficha de la banda</span>
      <h1 class="titulo-xl banda-cabecera__nombre">${esc(b.nombre)}</h1>
      <div class="datos__etiquetas">
        ${b.actividad ? `<span class="pildora">Años de actividad: ${esc(b.actividad)}</span>` : ""}
        <span class="pildora">${shows.length === 1 ? "1 show" : `${shows.length} shows`}</span>
      </div>
      <p class="datos__bio">${esc(b.bio)}</p>
    </div>
  </div>`;

  const miembros = $("#miembros");
  if (b.miembros.length) {
    miembros.innerHTML = b.miembros
      .map(
        (m) => `<li><strong>${esc(m.nombre)}</strong>${m.rol ? `<span>${esc(m.rol)}</span>` : ""}</li>`
      )
      .join("");
  } else {
    $("#miembros-seccion")?.remove();
  }

  const grilla = $("#banda-shows");
  if (shows.length) {
    grilla.innerHTML = shows.map(tarjetaRecital).join("");
  } else {
    $("#shows-seccion")?.remove();
  }
}

/* ================================================ NOTA (¡Vino a Argentina!) */

function initNota() {
  const a = alertas.find((x) => x.slug === param("slug")) || alertas[0];
  if (!a) return noEncontrado("Esa nota no existe.");

  const b = bandaDe(a.banda);
  const r = recitalDe(a.recital);
  const img = b?.img || r?.img;
  const rotulo = a.tipo === "viene" ? "¡Viene a Argentina!" : "¡Vino a Argentina!";
  document.title = `${a.titulo} · PlayConcert`;

  $("#nota").innerHTML = `
    <div class="nota__foto media">${foto(img, b?.nombre || a.titulo, { cargaAnticipada: true })}</div>
    <div class="nota">
      <div class="datos__etiquetas">
        <span class="pildora pildora--celeste">${esc(rotulo)}</span>
        <span class="pildora pildora--amarilla">${esc(a.anio)}</span>
        <span class="pildora">${esc(a.lugar)}</span>
      </div>
      <h1 class="titulo-xl">${esc(a.titulo)}</h1>
      <div class="nota__cuerpo">
        <p class="nota__copete">${esc(a.copete)}</p>
        ${a.cuerpo.map((p) => `<p>${esc(p)}</p>`).join("")}
      </div>
      <div class="destacado__pie">
        ${r ? `<a class="boton" href="${urlRecital(r.slug)}">Ver el recital completo</a>` : ""}
        ${b ? `<a class="boton" href="${urlBanda(b.slug)}">Ficha de ${esc(b.nombre)}</a>` : ""}
      </div>
    </div>`;
}

/* ================================================= PELÍCULA (Cine & música) */

function initPelicula() {
  const p = cine.find((x) => x.slug === param("slug")) || cine[0];
  if (!p) return noEncontrado("Esa película no está en cartelera.");

  const b = bandaDe(p.banda);
  const r = recitalDe(p.recital);
  const img = b?.img || r?.img;
  document.title = `${p.titulo} · PlayConcert`;

  const filas = [
    ["Año", p.anio],
    ["Tipo", p.tipo],
    ["Dirección", p.director],
    ["Duración", p.duracion],
    ["Banda", b?.nombre],
  ].filter(([, v]) => v);

  $("#pelicula").innerHTML = `<div class="cine" style="background:var(--verde)">
    <div class="cine__afiche media media--velo">
      ${foto(img, p.titulo, { cargaAnticipada: true })}
      <span class="pildora pildora--amarilla media__marca media__marca--abajo-der">${esc(p.anio)}</span>
    </div>
    <div style="min-width:0">
      <span class="pildora pildora--rosa">Cine &amp; música</span>
      <h1 class="titulo-l cine__titulo">${esc(p.titulo)}</h1>
      <p class="cine__sinopsis">${esc(p.sinopsis)}</p>
      <div class="cine__datos">
        <span class="estrellas" aria-label="${p.puntaje} de 5">${"★".repeat(p.puntaje)}${"☆".repeat(5 - p.puntaje)}</span>
        ${p.etiquetas.map((e) => `<span class="pildora">${esc(e)}</span>`).join("")}
      </div>
    </div>
  </div>

  <div class="datos">
    <div>
      <h2 class="titulo-m" style="margin-bottom:14px">Por qué verla</h2>
      <p class="datos__bio">${esc(p.porque)}</p>
      <div class="destacado__pie" style="margin-top:24px">
        ${r ? `<a class="boton" href="${urlRecital(r.slug)}">Ver el recital de ${esc(r.artista)}</a>` : ""}
        ${b ? `<a class="boton" href="${urlBanda(b.slug)}">Ficha de ${esc(b.nombre)}</a>` : ""}
      </div>
    </div>
    <aside class="panel">
      <h2>Ficha</h2>
      <dl style="margin:0">
        ${filas.map(([k, v]) => `<div class="panel__fila"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
      </dl>
    </aside>
  </div>`;
}

/* ==================================================================== 404 */

function noEncontrado(mensaje) {
  const main = $("main");
  if (main) {
    main.innerHTML = `<div class="interna">
      <div class="vacio">
        <img class="vacio__iso" src="assets/marca/iso.png" alt="" width="961" height="273">
        <p>${esc(mensaje)}</p>
        <a class="boton" href="index.html">Volver al inicio</a>
      </div>
    </div>`;
  }
}

/* ================================================================= arranque */

const PANTALLAS = {
  home: initHome,
  artistas: initArtistas,
  recitales: initRecitales,
  generos: initGeneros,
  recital: initRecital,
  banda: initBanda,
  nota: initNota,
  pelicula: initPelicula,
};

/**
 * El contenido se inyecta después de cargar, así que cuando se entra con un
 * ancla (index.html#catalogo) el navegador ya saltó a una posición que todavía
 * no existía. Rehacemos el salto una vez que las secciones están pintadas.
 */
function reubicarAncla() {
  const destino = location.hash && document.querySelector(location.hash);
  if (destino) requestAnimationFrame(() => destino.scrollIntoView({ behavior: "auto" }));
}

/**
 * El <select> del header mobile navega al elegir. En la home los valores son
 * anclas de la misma página (y el salto lo suaviza `scroll-behavior`); en las
 * internas apuntan a index.html.
 */
function initMenuMovil() {
  const select = document.getElementById("ir-a");
  select?.addEventListener("change", () => {
    if (select.value) location.href = select.value;
  });
}

/**
 * Publica el alto real del header sticky en `--alto-cabecera` para que
 * `scroll-padding-top` deje la sección debajo y no tapada. Se observa el
 * elemento porque el alto cambia solo al pasar de una fila a dos.
 */
function ajustarAnclas() {
  const cabecera = document.querySelector(".cabecera");
  if (!cabecera) return;
  const medir = () =>
    document.documentElement.style.setProperty("--alto-cabecera", `${cabecera.offsetHeight}px`);
  // Sincrónico primero: `reubicarAncla()` corre a continuación y el observer
  // recién avisaría en el frame siguiente, con el salto ya hecho de menos.
  medir();
  new ResizeObserver(medir).observe(cabecera);
}

const arrancar = () => {
  PANTALLAS[document.body.dataset.pagina]?.();
  initMenuMovil();
  ajustarAnclas();
  reubicarAncla();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", arrancar);
} else {
  arrancar();
}
