# Sitios de lujo en Miami

Tres sitios web estáticos e independientes, bilingües (inglés / español):

| Carpeta | Sitio | Contenido |
| --- | --- | --- |
| [`constructora/`](constructora/) | **American Restoration Services** | Constructora de casas de lujo nuevas (sin restauraciones): portafolio filtrable, calendario de obra a escala, especificaciones para huracanes (HVHZ), servicios y formulario de proyecto. |
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
  js/core.js      idioma, menú, fotos y formularios (igual en los tres sitios)
  js/main.js      lo propio de cada sitio (filtros, propiedades, calculadora)
  img/            ilustraciones SVG y favicon
```

## Cómo editar textos

- **Inglés**: directamente en `index.html`.
- **Español**: en `js/i18n.js`. Cada elemento traducible tiene un atributo `data-i18n="clave"` y la misma clave en `I18N.es`. Si falta una clave, se muestra el texto en inglés.
- **Propiedades de Wendy Realtor**: en el arreglo `LISTINGS` de `realtor/js/main.js` (precio, habitaciones, baños, superficie, frente al agua, estado, descripción y características en ambos idiomas).
- **Calculadora de inversionistas**: el retorno preferente (8%) y el reparto (70/30) están al inicio de `inversionistas/js/main.js`. Si cambian los términos, actualice también la hoja de términos en `index.html`.

## Fotos

Cada imagen tiene dos capas: una ilustración SVG propia (en `img/`) y encima una foto. Si la foto no carga, queda la ilustración.

Las fotos actuales son **fotos de stock de Unsplash** puestas como referencia: no son proyectos ni propiedades reales de estos negocios. Antes de publicar, reemplácelas por fotografía propia: cambie el `src` de cada `<img class="media__photo">` (o el campo `photo` en `LISTINGS`) por la ruta de su imagen, por ejemplo `img/casa-brisa.jpg`.

Para la foto de Wendy, guarde el retrato como `realtor/img/wendy.jpg` y descomente la etiqueta `<img>` en la sección "About" de `realtor/index.html`. Hasta entonces se muestra un monograma "W".

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
