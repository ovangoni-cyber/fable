# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Contexto del proyecto

Repositorio con cuatro webs estáticas bilingües (inglés y español), sin framework: HTML, CSS y JavaScript puros. `agencia/` se publica en un VPS propio (ver *Publicación de `agencia/`*); las demás están preparadas para Netlify. La persona que encarga el trabajo habla español: responde en español, con explicaciones claras y paso a paso, porque no es programadora. Antes de hacer cambios grandes, haz las preguntas necesarias.

| Carpeta | Web | Notas |
| --- | --- | --- |
| `realtor/` | **Ingrid Cabeza**: web personal de la agente | Marca personal (monograma IC, llave con su retrato). Trato de "usted" en el panel. |
| `agencia/` | **Ingrid Realtor**: versión inmobiliaria de la misma clienta | Copia de `realtor/` donde la marca es la inmobiliaria e Ingrid es la fundadora y agente. Portada con buscador, mapa, calculadora de hipoteca, guías. Textos de "tú" y en plural. |
| `constructora/` | American Restoration Services | Sin panel. |
| `inversionistas/` | Arcova Capital (nombre provisional) | Sin panel. |

"Realtor" puede referirse a cualquiera de las dos primeras; si no está claro, pregunta cuál.

## La clienta (Ingrid Cabeza)

- Teléfono y WhatsApp (786) 626-4910, correo ingrid.realtor91@gmail.com, licencia SL3644016.
- Oficina en Cape Coral, FL 33904 (confirmado).
- Su agencia (broker) es **BEST DEALS REALTY** (`data/web/contacto.json → agencia`). En Florida la publicidad debe llevarlo.
- Su foto (`img/ingrid.jpg`) está recortada de su tarjeta de visita: tiene poca resolución.
- Estética de su tarjeta: marfil, negro y dorado (fuentes Cinzel, Cormorant Garamond y Jost). Solo tema claro.
- Las 18 propiedades, las cifras y los testimonios son de ejemplo (zonas de Miami) y no salen en la web publicada. Ella trabaja en Cape Coral: hay que cambiar vecindarios y propiedades.

## Cómo funcionan `realtor/` y `agencia/`

Las dos tienen la misma arquitectura. Cada carpeta se publica como un sitio de Netlify distinto con **Base directory** igual al nombre de la carpeta.

Son **copias independientes**, no comparten archivos: un arreglo en una (panel, API, scripts, `core.js`, `catalog.js`…) casi siempre hay que repetirlo en la otra. Solo `agencia/` tiene mapa, calculadora, guías, marca editable y `data/listings.js`. `constructora/` e `inversionistas/` usan el mismo esquema de idiomas (`js/core.js` + `js/i18n.js`) pero sin datos, panel ni build. `index.html` de la raíz solo enlaza los cuatro sitios. `?lang=es` o `?lang=en` en la URL fuerza el idioma.

`agencia/` tiene que funcionar también abierta con doble clic (`file://`): nada de `fetch` a archivos locales (por eso existe `data/listings.js`) y los mapas usan otro proveedor en ese caso (ver *Mapa*).

- **Idiomas**: el inglés está escrito en el HTML; el español está en `js/i18n.js` (`I18N.es`, claves `data-i18n`) y las cadenas de los scripts en `I18N.strings.{en,es}` (`Site.t`). `js/core.js` aplica el idioma.
- **Propiedades**: un JSON por propiedad en `data/propiedades/`. `scripts/build-listings.js` las junta en `data/listings.json` (en `agencia/` también escribe `data/listings.js`, para cuando la web se abre desde una carpeta con `file://`). `js/listings.js` las carga.
- **Textos y datos de la web**: `data/web/*.json` (contacto, portada, vecindarios, servicios, valoración, sobre-mi, testimonios, página de propiedades y, en `agencia/`, guías y calculadora). `scripts/build-site.js` los escribe en las páginas: solo toca lo que está entre `<!-- web:nombre -->` y `<!-- /web:nombre -->`, los elementos con `data-web="…"`, las claves `data-i18n` que gestiona y los bloques `// web:es` y `// web:areas` de `js/i18n.js`. **No edites a mano esas partes de las páginas**: cambia el JSON y ejecuta el script. Ejecutarlo dos veces no debe cambiar nada; compruébalo tras cada cambio en el script.
- **Nombre de la marca** (solo `agencia/`): `data/web/contacto.json → marca.nombre`. Cada página guarda el nombre actual en `<meta name="x-brand">` y `build-site.js` lo sustituye en todas partes. En los textos del panel, `{marca}` se cambia por el nombre.
- **Panel** (`admin/`, Decap CMS 3.16.3 desde unpkg): su configuración está en `admin/config.mjs`, que es la única fuente. La usan el panel y la API. Guarda en GitHub (`ovangoni-cyber/fable`, rama `main`).
- **API** (`netlify/functions/api/api.mjs`): en `/api`, con clave (`API_KEY`) y token de GitHub (`GITHUB_TOKEN`). Valida con los campos de `admin/config.mjs`. Documentación en `API.md`.
- **Mapa** (`agencia/js/map.js`): Leaflet 1.9.4 desde cdnjs y mapas de OpenStreetMap; abierta desde una carpeta (`file://`) usa los de Esri, porque OpenStreetMap responde "403 Access blocked" sin Referer y CARTO pide clave. Cada propiedad tiene `ubicacion` (GeoJSON en texto); sin ella, el centro del vecindario. Las privadas nunca salen en el mapa.
- Netlify ejecuta `node scripts/build-site.js && node scripts/build-listings.js` (ver `netlify.toml`).
- Guías para la clienta: `GUIA-PANEL.md` en cada carpeta. Más detalle en el `README.md` de la raíz.

## Publicación de `agencia/` (VPS)

- **Servidor**: VPS de Hostealo, Ubuntu 26.04, `79.110.63.60`. Dominio `ingrid-realtor.com` (comprado en IONOS; registros A de `@` y `www` al VPS). Entrar: `ssh root@79.110.63.60` o, para publicar, `deploy@79.110.63.60`. Solo con llave: la entrada con contraseña está cerrada en `/etc/ssh/sshd_config.d/10-hardening.conf`.
- **Nginx** sirve `/var/www/ingrid-realtor/current`, un enlace a la versión activa en `releases/`. La configuración está en `agencia/server/deploy/` y se instala con `provision.sh` (cómo ejecutarlo, en su cabecera; se puede repetir sin riesgo). Certificado de Let's Encrypt con `certbot --webroot` y renovación automática.
- **Sin panel ni API en el VPS**: los cambios los pide el dueño en Claude Code. Flujo: editar los JSON → build → comprobar (español e inglés, escritorio y 390 px) → commit → push a `main` → `bash agencia/scripts/deploy.sh`. El script se niega a publicar si hay cambios sin commit o si `HEAD` no es `origin/main`, pasa las pruebas, sube solo lo público (nada de `admin/`, `netlify/`, `tests/`, `scripts/`, `*.md`), cambia de versión de forma atómica y guarda las 5 últimas. `--rollback` vuelve a la anterior. `bash tests/deploy.test.sh` lo prueba contra una carpeta temporal del VPS.
- **Formularios**: `js/core.js` envía a `/api/form` (de `contacto.json → formularios`). Nginx lo pasa a `agencia/server/main.mjs` (servicio `ingrid-forms`, 127.0.0.1:3100, sin dependencias), que guarda cada mensaje en `/var/lib/ingrid-forms/submissions.jsonl` (12 meses, `logrotate`) y lo envía desde `info@ingrid-realtor.com` (correo de IONOS, `smtp.ionos.com`, puerto 465) al Gmail de Ingrid, con `Reply-To` del cliente. Lleva honeypot (`website`), límite de 5 envíos por IP cada 10 minutos y comprobación de `Origin`. Credenciales solo en `/etc/ingrid-forms.env` en el VPS (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_TO`; el dueño lo escribe en el VPS), nunca en el repositorio ni en el chat. Pruebas: `node tests/forms.test.mjs`. Para probar en vivo con `curl`, usa `--form-string`: con `-F`, un valor que empieza por `(` se envía vacío.
- **Textos de la web** (2026-11-02): vienen del formulario de Tally del usuario (tally.so/r/D4rNOZ). La portada y "Sobre mí" van en primera persona: Ingrid Wendy Cabeza, agente de Best Deals Realty. Las tarjetas son Comprar, Construir y Vender; ya no hay Alquilar en la portada, pero la guía de alquiler sigue. Los formularios de la portada llevan dos casillas: autorizar el contacto (obligatoria) y recibir novedades (opcional), que el correo muestra como `consent`/`news`. El correo público es `info@ingrid-realtor.com`; los formularios siguen llegando a `MAIL_TO`.
- **Sin propiedades por ahora** (2026-11-02): `data/web/pagina-propiedades.json → "publicada": false`. Con eso `deploy.sh` no sube `properties.html`, `property.html`, sus scripts ni sus datos, y `sitemap.xml` solo lleva portada, guías y privacidad. La portada lleva un formulario corto en lugar del buscador (`#hero-form`, asunto "Contacto rápido (portada)") y no tiene destacados, vecindarios, mapa, cifras ni testimonios (las cifras y testimonios están apagados con `mostrar: false`). Para volver a ponerlas: cambiar ese valor a `true`, recuperar de git la portada, el menú y `js/main.js` de antes del commit "Publish the agency site without properties", y comprobar.
- **Abierta a los buscadores**: `robots.txt` (lo escribe `build-site.js`) permite todo y anuncia `sitemap.xml`; `/etc/nginx/ingrid/noindex.conf` en el VPS está vacío. `contacto.json → dominio` da la dirección para `og:image`, `og:url` y `sitemap.xml`. Sin Google Search Console (decisión del usuario): Google la encuentra solo por `robots.txt`; a Bing y demás se les avisa con `node scripts/indexnow.mjs` después de publicar (la llave es `agencia/<32 hex>.txt`; volver a ejecutarlo cuando cambien las páginas, p. ej. al activar las propiedades).
- `.gitattributes` mantiene LF en `*.sh` y `agencia/server/**`: con CRLF fallarían en Linux.

## Comprobar los cambios

No hay `package.json`, dependencias, linter ni paso de compilación: solo Node 18 o superior para los scripts y las pruebas. Dentro de `realtor/` o `agencia/`:

```bash
node scripts/build-site.js && node scripts/build-listings.js   # aplicar datos; repetir: no debe cambiar nada
node tests/api.test.mjs                                         # pruebas de la API con un GitHub simulado
node tests/site.test.mjs                                        # (agencia) enlaces para compartir, broker, formularios, robots y sitemap
node tests/forms.test.mjs                                       # (agencia) servicio de formularios
npx http-server -p 8080 -c-1 .                                  # ver la web en local
```

Para probar el panel en local: `npx decap-server` en la raíz del repositorio y abrir `/admin/` del sitio servido. En el contenedor en la nube, cdnjs, unpkg y los mapas de OpenStreetMap pueden estar bloqueados para el navegador de pruebas: sirve Leaflet desde el paquete de npm (`npm pack leaflet@1.9.4`) y Decap desde `npm pack decap-cms@3.16.3` (`dist/decap-cms.js`) interceptando las peticiones con Playwright, y usa una imagen de relleno para los mapas.

`tests/api.test.mjs` es un único script secuencial (no hay runner ni forma de lanzar una sola prueba): copia el sitio a una carpeta temporal, levanta un GitHub falso y llama a `api.mjs` directamente; imprime `PASS`/`FAIL` por comprobación y sale con código 1 si alguna falla. Para depurar una, busca su nombre en la salida.

En Windows el repositorio está con `core.autocrlf=true` y los scripts de build escriben LF: tras ejecutarlos, `git status` muestra como cambiados archivos cuyo contenido es idéntico. Compruébalo con `git diff --ignore-cr-at-eol --stat` y descarta esos cambios con `git checkout --`.

Revisa siempre la web en español y en inglés, en escritorio y a 390 px de ancho, sin errores de JavaScript ni desbordamiento horizontal.

## Entregas que suele pedir

- Capturas de pantalla.
- Un zip para arrastrar a Netlify Drop o abrir en la computadora. Tiene que funcionar con doble clic y llevar la demo del panel (`admin/index.html`, con el backend `test-repo` de Decap y los datos incrustados) y una página `ABRIR-AQUI.html` con enlaces a la web y al panel.
- Una vista previa en un solo HTML.
- En el móvil no puede abrir archivos HTML: para verlo en el teléfono necesita un enlace (Netlify o un artifact de Claude).

## Estado y pendientes

- `main` tiene las cuatro webs, con `realtor/` y `agencia/` completas (PR #1 y #2 fusionados).
- `agencia/` se publica en el VPS (ver arriba). Diseño y plan en `docs/superpowers/`. `realtor/` sigue sin publicar (preparada para Netlify; pasos en el README).
- Las propiedades, cifras y testimonios de `agencia/` siguen siendo de ejemplo (Miami) y por eso no se publican. Cuando la clienta dé las reales (y vecindarios de Cape Coral), se vuelven a activar.
- Las guías de `agencia/` son orientativas: deben revisarlas alguien con licencia.

## Reglas para los commits

- Mensajes en inglés, claros, sin identificadores de modelo.
- No abras pull requests salvo que te lo pidan.
