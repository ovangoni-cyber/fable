# Sitios de lujo en Miami

Tres sitios web estáticos e independientes, bilingües (inglés / español):

| Carpeta | Sitio | Contenido |
| --- | --- | --- |
| [`constructora/`](constructora/) | **American Restoration Services** | Constructora de lujo con estructura inspirada en casasflorida.cl: tres líneas de casas llave en mano (Mediterránea, Moderna y Costera, con 3 modelos cada una), restauración y reformas con comparador antes/después, portafolio filtrable, calendario de obra, especificaciones para huracanes (HVHZ), "Quiénes somos" y formulario de proyecto. |
| [`realtor/`](realtor/) | **Wendy Realtor** | Propiedades con buscador, filtros y ficha detallada; guía de vecindarios; servicios para comprar, vender y comprar desde el exterior; valoración privada y contacto con WhatsApp. |
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

## Cómo editar textos

- **Inglés**: directamente en `index.html`.
- **Español**: en `js/i18n.js`. Cada elemento traducible tiene un atributo `data-i18n="clave"` y la misma clave en `I18N.es`. Si falta una clave, se muestra el texto en inglés.
- **Modelos de la constructora**: las tres líneas y sus modelos están en la sección `#models` de `constructora/index.html`; cada botón "Solicitar precio" rellena el formulario con el modelo elegido.
- **Propiedades de Wendy Realtor**: en el arreglo `LISTINGS` de `realtor/js/main.js` (precio, habitaciones, baños, superficie, frente al agua, estado, descripción y características en ambos idiomas).
- **Calculadora de inversionistas**: el retorno preferente (8%) y el reparto (70/30) están al inicio de `inversionistas/js/main.js`. Si cambian los términos, actualice también la hoja de términos en `index.html`.

## Imágenes

Las imágenes de casas, propiedades y casos son **renders 3D ilustrativos** generados para este proyecto (no son fotos de proyectos reales ni fotos de stock). Cada web lo indica en el pie de página. Antes de publicar, reemplácelas por fotografía real con el mismo nombre de archivo en `img/`, o cambie el `src` de cada `<img class="media__img">`. En Wendy Realtor, las imágenes de las propiedades se indican en el campo `img` de `LISTINGS` (`realtor/js/main.js`).

Tamaños recomendados: portada 2000 × 1250 px, tarjetas 1200 × 900 px, vecindarios 1000 × 1250 px, en JPG de calidad 80–85%.

Los dibujos técnicos (alzados en `constructora/img/elevation*.svg` y el plano del lote en `inversionistas/img/siteplan.svg`) son SVG y se pueden conservar.

Para la foto de Wendy, guarde el retrato como `realtor/img/wendy.jpg` y descomente la etiqueta `<img>` en la sección "About" de `realtor/index.html`. Hasta entonces se muestra un monograma "W".

Cada sitio incluye `img/og.jpg` (imagen de 1200 × 630 px para cuando se comparte el enlace en redes o WhatsApp) y `img/apple-touch-icon.png`. Cuando tengan dominio, cambien `og:image` por la URL completa, por ejemplo `https://sudominio.com/img/og.jpg`.

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

**Wendy Realtor** (`realtor/`)
- Teléfono y WhatsApp (305) 555-0199, correo `hello@wendyrealtor.com`, oficina.
- Nombre de la agencia en el pie ("Brokered by [Brokerage Name]"). En Florida la publicidad debe incluir el nombre de la agencia.
- Tipo de licencia (asociada de ventas o broker), idiomas y especialidad.
- Cifras: $1.2B en ventas, 214 casas, 38% fuera del mercado.
- Las ocho propiedades son ejemplos; los tres testimonios también.
- Retrato de Wendy.

**Inversionistas** (`inversionistas/`)
- Nombre de la empresa: "Arcova Capital" es provisional. Para cambiarlo, busque y reemplace `Arcova Capital`, `Arcova` y `arcovacapital.com` en `inversionistas/` (HTML e `i18n.js`). Antes de elegir un nombre, confirme que esté libre en Sunbiz (registro de empresas de Florida) y en la USPTO (marcas).
- Correo, teléfono y dirección.
- Mercados, objetivos de retorno, calendario del proyecto, hoja de términos y casos: todos son ilustrativos.
- Los textos legales (Regla 506(c), avisos de riesgo) son un punto de partida. **Un abogado de valores debe revisarlos antes de publicar**, igual que cualquier cifra de rendimiento.
