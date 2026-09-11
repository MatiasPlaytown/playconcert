/**
 * editorial.js — lo que se cambia a mano cada semana.
 *
 * Es lo único que NO sale del export de WordPress: todavía no existe como
 * categoría en contenidos.vip/eventos. Cuando se haga la integración, cada
 * bloque de acá pasa a ser una categoría de post y este archivo se cae:
 *
 *   heroSemanal   → recitales del catálogo marcados como destacados (post meta)
 *   alertas       → categoría `vino-a-argentina`  (bandas que vinieron o vienen)
 *   cine          → categoría `cine-y-musica`     (películas sobre música)
 *
 * Rotación: `heroSemanal` y el artista destacado giran solos con la semana ISO
 * (ver `semanaISO()` en app.js). Para el hero se recorre esta lista en orden;
 * para el artista, todo el catálogo de bandas. Nadie tiene que tocar código:
 * agregar o sacar una entrada de `heroSemanal` cambia la rotación.
 *
 * Los `slug` referencian a datos.js (recitales y bandas). La imagen sale siempre
 * de ahí — acá no se define ninguna, para que nunca haya una tarjeta sin foto.
 */

/* ---------------------------------------------------------------- 1) Hero ---
   Un recital grande por semana. El titular y la bajada son de redacción: el
   dato duro (año, lugar, banda, imagen) lo pone datos.js. */
export const heroSemanal = [
  {
    recital: "queen-we-will-rock-you",
    volanta: "Conciertos que definieron una época",
    titular: "El día que Queen hizo cantar a Wembley",
    bajada:
      "Wembley Arena, 1986. Setenta y dos mil personas aplaudiendo al mismo tiempo en «Radio Ga Ga», y Freddie cerrando con «We Are The Champions».",
  },
  {
    recital: "the-beatles-en-vivo-en-el-shea-stadium",
    volanta: "El show que inventó el estadio",
    titular: "Los Beatles y las 55 mil personas del Shea",
    bajada:
      "Nueva York, 1965. El primer recital de la historia en un estadio de béisbol: nadie escuchó nada y todos se acuerdan de todo.",
  },
  {
    recital: "bob-marley-leyenda-en-vivo",
    volanta: "Reggae en su casa",
    titular: "Bob Marley, en vivo en Jamaica",
    bajada:
      "1979. El reggae como himno de esperanza y cambio, tocado en el lugar donde nació y por el que lo llevó al mundo.",
  },
  {
    recital: "david-bowie-starman",
    volanta: "Tres minutos que cambiaron todo",
    titular: "Bowie, Starman y la BBC",
    bajada:
      "Londres, 1972. Ziggy Stardust en Top of the Pops: el brazo sobre el hombro de Mick Ronson y una generación entera decidiendo su futuro.",
  },
  {
    recital: "the-who-live-at-kilburn-1971",
    volanta: "Volumen sin red",
    titular: "The Who en Kilburn, a toda potencia",
    bajada:
      "Londres. La formación clásica tocando como si el escenario tuviera que quedar destruido al final, porque solía quedar así.",
  },
  {
    recital: "jimi-hendrix-experience-hendrix",
    volanta: "Homenaje a la guitarra",
    titular: "Experience Hendrix: el tributo a Jimi",
    bajada:
      "Una gira entera dedicada a rehacer su repertorio con los músicos que tocaron con él y los que aprendieron de él.",
  },
  {
    recital: "paul-mccartney-live-at-the-cavern-club",
    volanta: "Vuelta al principio",
    titular: "McCartney vuelve al Cavern Club",
    bajada:
      "Liverpool, 1999. Trescientas personas en el sótano donde empezó todo, con David Gilmour e Ian Paice de invitados.",
  },
  {
    recital: "the-rolling-stones-live-in-toronto",
    volanta: "Los Stones en formato chico",
    titular: "Palais Royale: los Stones en un club",
    bajada:
      "Toronto, 2002. Después de años de estadios, la banda se metió en una sala de mil personas para tocar los temas de siempre.",
  },
  {
    recital: "sex-pistols-there-will-always-be-an-england",
    volanta: "Punk treinta años después",
    titular: "Los Sex Pistols vuelven a Londres",
    bajada:
      "2007. La reunión que nadie pedía y todos fueron a ver, con el repertorio de «Never Mind the Bollocks» completo.",
  },
  {
    recital: "nat-king-cole-an-evening-with-nat-king-cole",
    volanta: "Una noche con el piano",
    titular: "Nat King Cole, una noche entera",
    bajada:
      "1964. La voz más cálida del jazz vocal, filmada cuando ya era una institución y todavía sonaba como un descubrimiento.",
  },
];

/* ------------------------------------------------------------ 2) Secciones ---
   Curaduría fija de la home. Son slugs de datos.js: si una banda o un recital
   se cae del catálogo, la sección lo saltea sola en vez de romperse. */

/** "Leyendas del rock": las seis bandas que abren la home. */
export const leyendas = [
  { banda: "queen", estado: "Legendario" },
  { banda: "the-rolling-stones", estado: "En actividad" },
  { banda: "david-bowie", estado: "Ícono global" },
  { banda: "jimi-hendrix", estado: "Legendario" },
  { banda: "the-who", estado: "Ícono global" },
  { banda: "bob-marley", estado: "Legendario" },
];

/** "Recitales históricos": la lista larga del medio de la home. */
export const historicos = [
  "the-beatles-en-vivo-en-el-shea-stadium",
  "david-bowie-starman",
  "queen-we-will-rock-you",
  "bob-marley-leyenda-en-vivo",
  "farm-aid-20th-anniversary",
  "paul-mccartney-live-at-the-cavern-club",
];

/**
 * "Noches latinoamericanas". El prototipo la titulaba "Rock en español", pero
 * de los cuatro shows grabados en la región sólo dos cantan en castellano
 * (Soda Stereo y los Cadillacs); Santana y The Police entran por el escenario,
 * no por el idioma. Se cambió el título de la sección, no su diseño.
 */
export const latinoamerica = [
  {
    recital: "soda-stereo-el-ultimo-concierto",
    titulo: "Gracias totales en River",
    desc: "El cierre de la gira Sueño Stereo ante un Monumental completo: la despedida más recordada del rock en español.",
  },
  {
    recital: "los-fabulosos-cadillacs-en-vivo-en-mexico",
    titulo: "Los Cadillacs en el Palacio",
    desc: "Ska, rock y reggae con la potencia del regreso de la banda al Palacio de los Deportes.",
  },
  {
    recital: "carlos-santana-supernatural-live",
    titulo: "Santana en el Auditorio Nacional",
    desc: "La gira de Supernatural pasó por México con la formación más celebrada de la banda.",
  },
  {
    recital: "the-police-certifiable-live-in-buenos-aires",
    titulo: "The Police vuelve a River",
    desc: "La gira de reunión eligió Buenos Aires para su registro oficial en vivo.",
  },
];

/* -------------------------------------------------- 3) ¡Vino a Argentina! ---
   Futura categoría `vino-a-argentina`: bandas que tocaron o van a tocar acá.
   `tipo` decide el rótulo del banner: "vino" (pasado) o "viene" (anuncio).
   Por ahora queda una sola nota, como se pidió. */
export const alertas = [
  {
    slug: "the-police-river-2007",
    tipo: "vino",
    titulo: "The Police cerró su reunión en River",
    anio: "2007",
    lugar: "Estadio River Plate, Buenos Aires",
    copete:
      "La gira de reunión de The Police eligió Buenos Aires para su registro oficial en vivo: 70.000 personas en el Monumental y un disco doble que salió de esa noche.",
    recital: "the-police-certifiable-live-in-buenos-aires",
    banda: "the-police",
    cuerpo: [
      "Veintitrés años después de separarse, Sting, Andy Summers y Stewart Copeland volvieron a subirse juntos a un escenario. La gira de reunión recorrió el mundo entero durante 2007 y 2008, pero cuando llegó el momento de elegir dónde filmar el registro oficial, la banda eligió Buenos Aires.",
      "El resultado fue «Certifiable: Live in Buenos Aires», grabado en el Estadio River Plate ante unas 70.000 personas. El repertorio recorrió los cinco discos de la banda, con «Synchronicity» y «Reggatta de Blanc» prácticamente completos y versiones extendidas de «Roxanne» y «Can't Stand Losing You».",
      "La prensa internacional destacó la química intacta del trío y la reacción del público argentino, que se escucha cantando de punta a punta en la grabación. Es, hasta hoy, el único registro audiovisual oficial de la gira de reunión.",
    ],
  },
];

/* ------------------------------------------------------- 4) Cine & música ---
   Futura categoría `cine-y-musica`: películas y documentales sobre música.
   Por ahora queda una sola, como se pidió. */
export const cine = [
  {
    slug: "lets-rock-again",
    titulo: "Let’s Rock Again",
    anio: "2004",
    tipo: "Documental",
    director: "Dick Rude",
    duracion: "65 min",
    puntaje: 4,
    etiquetas: ["Íntimo", "Punk rock", "Imperdible"],
    sinopsis:
      "Los últimos años de Joe Strummer con The Mescaleros: pegar afiches él mismo por la ciudad, pelear por un pase de radio, tocar en bares chicos y volver a empezar de cero después de The Clash. Punk, reggae y folk en la misma gira, filmado por un amigo con una cámara en la mano.",
    porque:
      "No es la película de una leyenda: es la de un tipo de cincuenta años convenciendo a un DJ de que pase su disco. Ahí está lo que la hace enorme.",
    recital: "joe-strummer-lets-rock-again",
    banda: "joe-strummer",
  },
];
