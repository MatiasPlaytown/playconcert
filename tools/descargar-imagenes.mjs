/**
 * descargar-imagenes.mjs — baja a `assets/img/` las fotos que `datos.js` referencia.
 *
 *     node tools/descargar-imagenes.mjs
 *
 * Mientras el sitio corre local no queremos depender del CDN, así que cada foto
 * de banda se guarda como `assets/img/bandas/<slug>.<ext>` y `datos.js` se
 * reescribe apuntando a la copia local (deja la URL remota en `imgRemota` por si
 * hace falta rehacerlo). Es idempotente: lo ya bajado no se vuelve a pedir.
 *
 * Ojo: las URLs de contenidos.vip dan 404 — sirve el CloudFront del plugin de S3,
 * que es lo que `generar-datos.mjs` deja escrito.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "assets", "img", "bandas");

const { bandas, recitales } = await import(join(RAIZ, "datos.js"));

mkdirSync(DESTINO, { recursive: true });

const extDe = (url) => (extname(new URL(url).pathname) || ".jpg").toLowerCase();

let bajadas = 0;
let cacheadas = 0;
const fallidas = [];
const local = new Map(); // url remota -> ruta local

for (const b of bandas) {
  if (!b.img || b.img.startsWith("assets/")) continue;
  const archivo = `${b.slug}${extDe(b.img)}`;
  const ruta = join(DESTINO, archivo);
  const rel = `assets/img/bandas/${archivo}`;

  if (existsSync(ruta)) {
    cacheadas++;
    local.set(b.img, rel);
    continue;
  }
  try {
    const res = await fetch(b.img);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(ruta, Buffer.from(await res.arrayBuffer()));
    local.set(b.img, rel);
    bajadas++;
    process.stdout.write(".");
  } catch (e) {
    fallidas.push(`${b.nombre}: ${e.message}`);
    process.stdout.write("x");
  }
}

// La genérica de los compilados "Varios" no cuelga de ninguna banda.
const GENERICA = recitales.find((r) => !r.bandaSlug)?.img;
if (GENERICA && !local.has(GENERICA)) {
  const ruta = join(DESTINO, `varios${extDe(GENERICA)}`);
  if (!existsSync(ruta)) {
    const res = await fetch(GENERICA);
    if (res.ok) writeFileSync(ruta, Buffer.from(await res.arrayBuffer()));
  }
  if (existsSync(ruta)) local.set(GENERICA, `assets/img/bandas/varios${extDe(GENERICA)}`);
}

process.stdout.write("\n");

// Reescribe datos.js apuntando a las copias locales.
const archivoDatos = join(RAIZ, "datos.js");
let js = readFileSync(archivoDatos, "utf8");
for (const [remota, rel] of local) {
  js = js.split(`"img": "${remota}"`).join(`"img": "${rel}",\n  "imgRemota": "${remota}"`);
}
writeFileSync(archivoDatos, js);

console.log(`imágenes: ${bajadas} nuevas, ${cacheadas} ya estaban, ${fallidas.length} fallaron`);
for (const f of fallidas) console.log("  !", f);
