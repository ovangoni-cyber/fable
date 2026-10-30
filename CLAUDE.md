# Contexto del proyecto

Repositorio con cuatro webs estáticas bilingües (inglés y español), sin framework: HTML, CSS y JavaScript puros, publicadas en Netlify. La persona que encarga el trabajo habla español: responde en español, con explicaciones claras y paso a paso, porque no es programadora. Antes de hacer cambios grandes, haz las preguntas necesarias.

| Carpeta | Web | Notas |
| --- | --- | --- |
| `realtor/` | **Ingrid Cabeza**: web personal de la agente | Marca personal (monograma IC, llave con su retrato). Trato de "usted" en el panel. |
| `agencia/` | **Ingrid Realtor**: versión inmobiliaria de la misma clienta | Copia de `realtor/` donde la marca es la inmobiliaria e Ingrid es la fundadora y agente. Portada con buscador, mapa, calculadora de hipoteca, guías. Textos de "tú" y en plural. |
| `constructora/` | American Restoration Services | Sin panel. |
| `inversionistas/` | Arcova Capital (nombre provisional) | Sin panel. |

"Realtor" puede referirse a cualquiera de las dos primeras; si no está claro, pregunta cuál.

## La clienta (Ingrid Cabeza)

- Teléfono y WhatsApp (786) 626-4910, correo ingrid.realtor91@gmail.com, licencia SL3644016.
- Oficina en Cape Coral, FL. El código postal 33904 es una suposición: confírmalo.
- Falta el nombre de su agencia (broker); en el pie sale "[Nombre de la agencia]". En Florida la publicidad debe llevarlo.
- Su foto (`img/ingrid.jpg`) está recortada de su tarjeta de visita: tiene poca resolución.
- Estética de su tarjeta: marfil, negro y dorado (fuentes Cinzel, Cormorant Garamond y Jost). Solo tema claro.
- Las 18 propiedades, las cifras y los testimonios son de ejemplo (zonas de Miami). Ella trabaja en Cape Coral: probablemente haya que cambiar vecindarios y propiedades.

## Cómo funcionan `realtor/` y `agencia/`

Las dos tienen la misma arquitectura. Cada carpeta se publica como un sitio de Netlify distinto con **Base directory** igual al nombre de la carpeta.

- **Idiomas**: el inglés está escrito en el HTML; el español está en `js/i18n.js` (`I18N.es`, claves `data-i18n`) y las cadenas de los scripts en `I18N.strings.{en,es}` (`Site.t`). `js/core.js` aplica el idioma.
- **Propiedades**: un JSON por propiedad en `data/propiedades/`. `scripts/build-listings.js` las junta en `data/listings.json` (en `agencia/` también escribe `data/listings.js`, para cuando la web se abre desde una carpeta con `file://`). `js/listings.js` las carga.
- **Textos y datos de la web**: `data/web/*.json` (contacto, portada, vecindarios, servicios, valoración, sobre-mi, testimonios, página de propiedades y, en `agencia/`, guías y calculadora). `scripts/build-site.js` los escribe en las páginas: solo toca lo que está entre `<!-- web:nombre -->` y `<!-- /web:nombre -->`, los elementos con `data-web="…"`, las claves `data-i18n` que gestiona y los bloques `// web:es` y `// web:areas` de `js/i18n.js`. **No edites a mano esas partes de las páginas**: cambia el JSON y ejecuta el script. Ejecutarlo dos veces no debe cambiar nada; compruébalo tras cada cambio en el script.
- **Nombre de la marca** (solo `agencia/`): `data/web/contacto.json → marca.nombre`. Cada página guarda el nombre actual en `<meta name="x-brand">` y `build-site.js` lo sustituye en todas partes. En los textos del panel, `{marca}` se cambia por el nombre.
- **Panel** (`admin/`, Decap CMS 3.16.3 desde unpkg): su configuración está en `admin/config.mjs`, que es la única fuente. La usan el panel y la API. Guarda en GitHub (`ovangoni-cyber/fable`, rama `main`).
- **API** (`netlify/functions/api/api.mjs`): en `/api`, con clave (`API_KEY`) y token de GitHub (`GITHUB_TOKEN`). Valida con los campos de `admin/config.mjs`. Documentación en `API.md`.
- **Mapa** (`agencia/js/map.js`): Leaflet 1.9.4 desde cdnjs y mapas de OpenStreetMap; abierta desde una carpeta (`file://`) usa los de Esri, porque OpenStreetMap responde "403 Access blocked" sin Referer y CARTO pide clave. Cada propiedad tiene `ubicacion` (GeoJSON en texto); sin ella, el centro del vecindario. Las privadas nunca salen en el mapa.
- Netlify ejecuta `node scripts/build-site.js && node scripts/build-listings.js` (ver `netlify.toml`).
- Guías para la clienta: `GUIA-PANEL.md` en cada carpeta. Más detalle en el `README.md` de la raíz.

## Comprobar los cambios

Dentro de `realtor/` o `agencia/`:

```bash
node scripts/build-site.js && node scripts/build-listings.js   # aplicar datos; repetir: no debe cambiar nada
node tests/api.test.mjs                                         # pruebas de la API con un GitHub simulado
npx http-server -p 8080 -c-1 .                                  # ver la web en local
```

Para probar el panel en local: `npx decap-server` en la raíz del repositorio y abrir `/admin/` del sitio servido. En el contenedor en la nube, cdnjs, unpkg y los mapas de OpenStreetMap pueden estar bloqueados para el navegador de pruebas: sirve Leaflet desde el paquete de npm (`npm pack leaflet@1.9.4`) y Decap desde `npm pack decap-cms@3.16.3` (`dist/decap-cms.js`) interceptando las peticiones con Playwright, y usa una imagen de relleno para los mapas.

Revisa siempre la web en español y en inglés, en escritorio y a 390 px de ancho, sin errores de JavaScript ni desbordamiento horizontal.

## Entregas que suele pedir

- Capturas de pantalla.
- Un zip para arrastrar a Netlify Drop o abrir en la computadora. Tiene que funcionar con doble clic y llevar la demo del panel (`admin/index.html`, con el backend `test-repo` de Decap y los datos incrustados) y una página `ABRIR-AQUI.html` con enlaces a la web y al panel.
- Una vista previa en un solo HTML.
- En el móvil no puede abrir archivos HTML: para verlo en el teléfono necesita un enlace (Netlify o un artifact de Claude).

## Estado y pendientes

- `main` tiene las cuatro webs, con `realtor/` y `agencia/` completas (PR #1 y #2 fusionados).
- Falta publicar en Netlify: crear el sitio desde GitHub, instalar el OAuth de GitHub para el panel, dar acceso a Ingrid y, si se usa, poner `API_KEY` y `GITHUB_TOKEN`. Los pasos están en el README.
- La clienta compró un dominio en IONOS. Falta saber cuál y conectarlo a Netlify, y luego cambiar `site_url` y `display_url` en `admin/config.mjs`.
- Los formularios no envían hasta que se configure un servicio (Formspree o Netlify Forms; campo *formularios* del panel).
- Las guías de `agencia/` son orientativas: deben revisarlas alguien con licencia.

## Reglas para los commits

- Mensajes en inglés, claros, sin identificadores de modelo.
- No abras pull requests salvo que te lo pidan.
