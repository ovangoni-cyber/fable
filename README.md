# Sitios de lujo en Miami

Tres sitios web estáticos e independientes, bilingües (inglés / español):

| Carpeta | Sitio | Contenido |
| --- | --- | --- |
| [`constructora/`](constructora/) | **American Restoration Services** | Constructora de lujo con estructura inspirada en casasflorida.cl: tres líneas de casas llave en mano (Mediterránea, Moderna y Costera, con 3 modelos cada una), restauración y reformas con comparador antes/después, portafolio filtrable, calendario de obra, especificaciones para huracanes (HVHZ), "Quiénes somos" y formulario de proyecto. |
| [`realtor/`](realtor/) | **Ingrid Cabeza** | Portada con buscador y propiedades destacadas. Página de propiedades inspirada en unicainmobiliaria.com: venta y alquiler, filtros (referencia, tipo, vecindario, precio, habitaciones, baños, superficie, frente al agua, exclusivas, obra nueva), orden, vista en cuadrícula o lista y paginación. Ficha de cada propiedad con galería, datos, vecindario, formulario, WhatsApp y propiedades similares. También tiene guía de vecindarios, servicios, valoración privada y contacto. |
| [`inversionistas/`](inversionistas/) | **Arcova Capital** (nombre provisional; la empresa aún no tiene nombre) | Inversión en casas de lujo nuevas, construidas para vender en Florida (sin restauraciones ni alquileres): tesis, seis mercados con mapa de Florida, estrategia con calendario de un proyecto típico, hoja de términos de ejemplo con fuentes y usos, calculadora de la cascada de distribuciones, riesgos, preguntas frecuentes y solicitud de acceso para inversionistas acreditados. |

`index.html` en la raíz es solo un índice que enlaza los tres sitios.

No hay dependencias ni paso de compilación: HTML, CSS y JavaScript puros. Las fuentes se cargan desde Google Fonts.

## Verlos en local

Abra cualquier `index.html` en el navegador, o sirva la carpeta:

```bash
npx http-server -p 8080 .
# http://localhost:8080/constructora/  ·  /realtor/  ·  /inversionistas/
```

Para forzar un idioma, agregue `?lang=es` o `?lang=en` a la URL. Si no, el sitio usa el idioma del navegador y recuerda la elección del botón EN/ES.

## Estructura de cada sitio

```
<sitio>/
  index.html      contenido en inglés (idioma por defecto)
  css/styles.css  diseño del sitio
  js/i18n.js      textos en español y textos usados por los scripts
  js/core.js      idioma, menú y formularios (igual en los tres sitios)
  js/main.js      lo propio de cada sitio (filtros, propiedades, calculadora)
  privacy.html    política de privacidad (inglés y español)
  img/            renders, dibujos SVG, imagen para redes y favicon
```

Ingrid Cabeza tiene además:

```
realtor/
  properties.html   todas las propiedades, con filtros y páginas
  property.html     ficha de una propiedad: property.html?id=harbor-drive
  data/propiedades/   una ficha por propiedad (se editan desde el panel /admin/)
  data/listings.json  todas las propiedades juntas; lo genera scripts/build-listings.js
  scripts/          build-listings.js: junta data/propiedades/ en data/listings.json
  admin/            panel de administración (Decap CMS) y su configuración
  img/propiedades/  fotos de las propiedades (las que se suben desde el panel)
  GUIA-PANEL.md     guía para Ingrid: cómo añadir, cambiar y quitar propiedades
  netlify.toml      ajustes de publicación en Netlify
  js/listings.js    carga data/listings.json
  js/catalog.js     tarjetas y textos comunes a las tres páginas
  js/properties.js  filtros, orden, vista y páginas
  js/property.js    galería, datos, formulario y propiedades similares
```

La búsqueda queda en la dirección (por ejemplo `properties.html?op=rent&area=brickell`), así que se puede compartir un enlace a una búsqueda o a una propiedad.

## Cómo editar textos

- **Inglés**: directamente en `index.html`.
- **Español**: en `js/i18n.js`. Cada elemento traducible tiene un atributo `data-i18n="clave"` y la misma clave en `I18N.es`. Si falta una clave, se muestra el texto en inglés.
- **Modelos de la constructora**: las tres líneas y sus modelos están en la sección `#models` de `constructora/index.html`; cada botón "Solicitar precio" rellena el formulario con el modelo elegido.
- **Propiedades de Ingrid Cabeza**: desde el panel de administración (ver más abajo). Cada propiedad queda en su propio archivo en `realtor/data/propiedades/` (el nombre del archivo es la dirección de su ficha), y al publicar Netlify ejecuta `node scripts/build-listings.js`, que las junta en `realtor/data/listings.json`. Si edita los archivos a mano, ejecute ese comando antes de probar la web. Cada propiedad tiene referencia, venta o alquiler (en alquiler el precio es mensual), tipo, vecindario, precio, habitaciones, baños, superficie, lote, frente al agua, año, estado (recién listada, en venta, bajo contrato, vendida, fuera del mercado o en alquiler), si es exclusiva, fotos, y descripción y características en ambos idiomas. La portada (incluida la propiedad destacada de arriba), la página de propiedades y las fichas se actualizan solas.
- **Calculadora de inversionistas**: el retorno preferente (8%) y el reparto (70/30) están al inicio de `inversionistas/js/main.js`. Si cambian los términos, actualice también la hoja de términos en `index.html`.

## Imágenes

Las imágenes de casas, propiedades y casos son **renders 3D ilustrativos** generados para este proyecto (no son fotos de proyectos reales ni fotos de stock). Cada web lo indica en el pie de página. Antes de publicar, reemplácelas por fotografía real con el mismo nombre de archivo en `img/`, o cambie el `src` de cada `<img class="media__img">`. En Ingrid Cabeza, las fotos de las propiedades están en `realtor/img/propiedades/` y se cambian desde el panel (la primera de cada propiedad es la principal).

Tamaños recomendados: portada 2000 × 1250 px, tarjetas 1200 × 900 px, vecindarios 1000 × 1250 px, en JPG de calidad 80–85%.

Los dibujos técnicos (alzados en `constructora/img/elevation*.svg` y el plano del lote en `inversionistas/img/siteplan.svg`) son SVG y se pueden conservar.

Logo de Ingrid Cabeza: `realtor/img/logo.svg` (monograma IC con el nombre, el de la tarjeta), `logo-mark.svg` (solo IC, para la cabecera), `favicon.svg` y `key.svg` (la llave). Son vectores dorados sobre fondo transparente, listos para imprimir o usar en redes. La web usa la versión clara (marfil, negro y dorado); la versión negra con dorado está guardada en el historial de git (commit 14955a1).

Para la foto de Ingrid, guarde el retrato como `realtor/img/ingrid.jpg` y descomente la línea `<image href="img/ingrid.jpg" …>` de la llave en la sección "Sobre mí" de `realtor/index.html`. Hasta entonces, el marco de la llave muestra el monograma IC.

Cada sitio incluye `img/og.jpg` (imagen de 1200 × 630 px para cuando se comparte el enlace en redes o WhatsApp) y `img/apple-touch-icon.png`. Cuando tengan dominio, cambien `og:image` por la URL completa, por ejemplo `https://sudominio.com/img/og.jpg`.

## Panel de administración (Ingrid Cabeza)

Ingrid puede añadir, cambiar y quitar propiedades desde `https://sudominio.com/admin/`, sin tocar código. El panel es [Decap CMS](https://decapcms.org): guarda cada cambio en este repositorio de GitHub y Netlify vuelve a publicar la web en uno o dos minutos. La guía para Ingrid está en [`realtor/GUIA-PANEL.md`](realtor/GUIA-PANEL.md).

Puesta en marcha (una sola vez):

1. **Rama**: el panel guarda en la rama `main` (`realtor/admin/config.yml`, campos `repo` y `branch`). Fusione esta rama en `main`, o cambie `branch` por la rama que publique la web.
2. **Netlify**: cree un sitio desde el repositorio de GitHub, con **Base directory** `realtor`. El `netlify.toml` de la carpeta ya indica el comando de compilación (`node scripts/build-listings.js`) y que se publica la carpeta tal cual. Asigne el dominio.
3. **GitHub OAuth**: en GitHub, *Settings → Developer settings → OAuth Apps → New OAuth App*. *Homepage URL*: la dirección del sitio. *Authorization callback URL*: `https://api.netlify.com/auth/done`. Copie el *Client ID* y genere un *Client secret*.
4. **Netlify**: en el sitio, *Site configuration → Access & security → OAuth → Install provider → GitHub*, y pegue el *Client ID* y el *Client secret*.
5. **Acceso de Ingrid**: cree una cuenta de GitHub para Ingrid (gratis) y añádala al repositorio con permiso de escritura (*Settings → Collaborators*).
6. Cambie `site_url` y `display_url` en `realtor/admin/config.yml` por el dominio real.

Para probar el panel en la computadora, sin GitHub: en la raíz del repositorio ejecute `npx decap-server`, y en otra terminal `cd realtor && npx http-server -p 8080`. Abra `http://localhost:8080/admin/`. Los cambios se guardan directamente en los archivos locales.

La web lee `data/listings.json` al cargar, así que necesita servirse desde un servidor (Netlify, o `npx http-server` en local); abriendo `index.html` con doble clic las propiedades no cargan.

## Privacidad

Cada sitio tiene su `privacy.html` (inglés y español), enlazada desde el pie de página y desde cada formulario. Es un borrador: **debe revisarlo un abogado** antes de publicar, en especial el de inversionistas.

## Formularios

Los formularios validan los campos y muestran confirmación, pero **todavía no envían a ningún correo**. Mientras no estén conectados, muestran "Modo de vista previa".

Para conectarlos, cree un formulario en un servicio como [Formspree](https://formspree.io) y copie la URL en el atributo `data-endpoint` de cada `<form>`:

```html
<form class="form" id="contact-form" novalidate data-endpoint="https://formspree.io/f/xxxxxxx">
```

## Publicar

Cada carpeta puede ir a su propio dominio (Netlify, Vercel, Cloudflare Pages o GitHub Pages). En GitHub Pages: *Settings → Pages → Deploy from a branch*, y los sitios quedan en `/constructora/`, `/realtor/` e `/inversionistas/`.

## Antes de publicar: datos que debe confirmar o reemplazar

Todo lo siguiente es contenido de ejemplo. Está marcado con comentarios `PLACEHOLDER` en el HTML donde corresponde.

**American Restoration Services** (`constructora/`)
- Teléfono (305) 555-0142, correo `info@americanrestorationservices.com`, dirección y horario.
- Número de licencia (`CGC0000000`).
- Cifras: 38 casas, 17 frente al agua, "desde 2009", garantía de 10 años.
- Líneas y modelos (nombres, superficies, habitaciones, plazos de obra) y los servicios de restauración: ajústelos a la oferta real.
- Los seis proyectos del portafolio (nombres, datos y fotos) y el testimonio.

**Ingrid Cabeza** (`realtor/`)
- Teléfono y WhatsApp (305) 555-0199, correo `hello@ingridcabeza.com`, oficina.
- Nombre de la agencia en el pie ("Brokered by [Brokerage Name]"). En Florida la publicidad debe incluir el nombre de la agencia.
- Tipo de licencia (asociada de ventas o broker), idiomas y especialidad.
- Cifras: $1.2B en ventas, 214 casas, 38% fuera del mercado.
- Las 18 propiedades son ejemplos (incluidas las referencias IC-xxxx); los tres testimonios también.
- Alquileres: Miami Beach y Golden Beach restringen los alquileres de corta duración. Los ejemplos dicen "seis meses o más"; confirme las normas de cada municipio antes de publicar alquileres reales.
- Retrato de Ingrid.

**Inversionistas** (`inversionistas/`)
- Nombre de la empresa: "Arcova Capital" es provisional. Para cambiarlo, busque y reemplace `Arcova Capital`, `Arcova` y `arcovacapital.com` en `inversionistas/` (HTML e `i18n.js`). Antes de elegir un nombre, confirme que esté libre en Sunbiz (registro de empresas de Florida) y en la USPTO (marcas).
- Correo, teléfono y dirección.
- Mercados, objetivos de retorno, calendario del proyecto, hoja de términos y casos: todos son ilustrativos.
- Los textos legales (Regla 506(c), avisos de riesgo) son un punto de partida. **Un abogado de valores debe revisarlos antes de publicar**, igual que cualquier cifra de rendimiento.
