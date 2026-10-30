// Panel de administración de la inmobiliaria (Decap CMS) y reglas de la API de la web.
// Este archivo es la única fuente de las dos cosas:
//   - admin/index.html lo carga para dibujar el panel.
//   - netlify/functions/api/api.mjs lo usa para comprobar lo que llega por la API.
// Cada propiedad es un archivo en agencia/data/propiedades/ y sus fotos van a agencia/img/propiedades/.
// Los textos, fotos y datos de contacto de la web están en agencia/data/web/.
// Al publicar, Netlify ejecuta scripts/build-site.js (aplica los textos a las páginas) y
// scripts/build-listings.js (junta las propiedades en data/listings.json).
// Puesta en marcha: ver "Panel de administración" en el README.
//
// backend.repo / backend.branch: el repositorio y la rama que publica Netlify.
// local_backend: para probar en la computadora con `npx decap-server` en la raíz del repositorio.
// site_url / display_url: cambie el dominio por el real.

const config = {
  "backend": {
    "name": "github",
    "repo": "ovangoni-cyber/fable",
    "branch": "main",
    "commit_messages": {
      "create": "Nueva propiedad {{slug}}",
      "update": "Actualizar propiedad {{slug}}",
      "delete": "Quitar propiedad {{slug}}",
      "uploadMedia": "Subir foto {{path}}",
      "deleteMedia": "Borrar foto {{path}}"
    }
  },
  "local_backend": true,
  "locale": "es",
  "site_url": "https://ingridcabeza.com",
  "display_url": "https://ingridcabeza.com",
  "logo_url": "../img/clave-mark.svg",
  "media_folder": "agencia/img/propiedades",
  "public_folder": "/img/propiedades",
  "collections": [
    {
      "name": "propiedades",
      "label": "Propiedades",
      "label_singular": "Propiedad",
      "description": "Pulse una propiedad para cambiarla, o \"+ Propiedad\" para añadir otra. Al terminar, pulse \"Publicar\".",
      "folder": "agencia/data/propiedades",
      "format": "json",
      "extension": "json",
      "create": true,
      "delete": true,
      "slug": "{{ref}}",
      "identifier_field": "title",
      "summary": "{{ref}} · {{title}}",
      "sortable_fields": [
        "ref",
        "title",
        "price"
      ],
      "editor": {
        "preview": false
      },
      "fields": [
        {
          "name": "title",
          "label": "Título",
          "widget": "string",
          "hint": "Ej.: Casa frente a la bahía con muelle privado"
        },
        {
          "name": "ref",
          "label": "Referencia",
          "widget": "string",
          "hint": "Ej.: IC-2620. Una distinta para cada propiedad.",
          "pattern": [
            "^[A-Za-z0-9-]+$",
            "Use letras, números y guiones"
          ]
        },
        {
          "name": "status",
          "label": "Estado",
          "widget": "select",
          "default": "sale",
          "options": [
            {
              "label": "En venta",
              "value": "sale"
            },
            {
              "label": "Recién listada (en venta)",
              "value": "new"
            },
            {
              "label": "Bajo contrato",
              "value": "contract"
            },
            {
              "label": "Vendida",
              "value": "sold"
            },
            {
              "label": "Privada: sin precio y con fotos difuminadas",
              "value": "private"
            },
            {
              "label": "En alquiler",
              "value": "rent"
            }
          ]
        },
        {
          "name": "type",
          "label": "Tipo",
          "widget": "select",
          "default": "house",
          "options": [
            {
              "label": "Casa",
              "value": "house"
            },
            {
              "label": "Condominio",
              "value": "condo"
            },
            {
              "label": "Penthouse",
              "value": "penthouse"
            }
          ]
        },
        {
          "name": "area",
          "label": "Vecindario",
          "widget": "relation",
          "collection": "web",
          "file": "vecindarios",
          "value_field": "zonas.*.id",
          "search_fields": [
            "zonas.*.nombre"
          ],
          "display_fields": [
            "zonas.*.nombre"
          ],
          "options_length": 50,
          "hint": "Los vecindarios se cambian en Web → Vecindarios."
        },
        {
          "name": "ubicacion",
          "label": "Ubicación en el mapa",
          "widget": "map",
          "type": "Point",
          "decimals": 5,
          "required": false,
          "hint": "Pulse en el mapa donde está la casa. Si lo deja vacío, sale cerca del centro del vecindario como \"ubicación aproximada\". Las propiedades privadas nunca salen en el mapa."
        },
        {
          "name": "price",
          "label": "Precio en dólares",
          "widget": "number",
          "value_type": "int",
          "min": 0,
          "hint": "Solo números. Ej.: 18950000. Si está en alquiler, el precio por mes."
        },
        {
          "name": "beds",
          "label": "Habitaciones",
          "widget": "number",
          "value_type": "int",
          "min": 0
        },
        {
          "name": "baths",
          "label": "Baños",
          "widget": "number",
          "value_type": "float",
          "min": 0,
          "step": 0.5,
          "hint": "Medio baño = 0.5"
        },
        {
          "name": "sqft",
          "label": "Superficie (pies²)",
          "widget": "number",
          "value_type": "int",
          "min": 0
        },
        {
          "name": "imgs",
          "label": "Fotos",
          "label_singular": "foto",
          "widget": "list",
          "min": 1,
          "collapsed": false,
          "hint": "La primera es la principal. Arrástrelas para cambiar el orden.",
          "field": {
            "name": "img",
            "label": "Foto",
            "widget": "image",
            "choose_url": false
          }
        },
        {
          "name": "video_url",
          "label": "Vídeo: enlace de YouTube o Vimeo",
          "widget": "string",
          "required": false,
          "hint": "Pegue el enlace del vídeo. Ej.: https://www.youtube.com/watch?v=… Es la mejor opción para vídeos largos."
        },
        {
          "name": "video_file",
          "label": "Vídeo: subir un archivo",
          "widget": "file",
          "required": false,
          "choose_url": false,
          "hint": "Si no tiene enlace, suba un vídeo corto en MP4 de menos de 50 MB. Si rellena los dos, se usa el enlace."
        },
        {
          "name": "desc",
          "label": "Descripción",
          "widget": "text"
        },
        {
          "name": "features",
          "label": "Características",
          "widget": "text",
          "required": false,
          "hint": "Una por línea. Ej.: Ascensor y cava"
        },
        {
          "name": "exclusive",
          "label": "Exclusiva",
          "widget": "boolean",
          "default": false,
          "required": false
        },
        {
          "name": "featured",
          "label": "Destacar en la portada",
          "widget": "boolean",
          "default": false,
          "required": false,
          "hint": "Sale la primera en Propiedades destacadas."
        },
        {
          "name": "details",
          "label": "Más detalles",
          "widget": "object",
          "collapsed": true,
          "required": false,
          "fields": [
            {
              "name": "place",
              "label": "Ubicación que se muestra",
              "widget": "string",
              "required": false,
              "hint": "Ej.: Sunset Islands, Miami Beach. Si lo deja vacío, se usa el vecindario."
            },
            {
              "name": "water",
              "label": "Frente al agua",
              "widget": "select",
              "default": "none",
              "required": false,
              "options": [
                {
                  "label": "No",
                  "value": "none"
                },
                {
                  "label": "Océano",
                  "value": "ocean"
                },
                {
                  "label": "Bahía",
                  "value": "bay"
                },
                {
                  "label": "Canal con salida al mar",
                  "value": "canal"
                }
              ]
            },
            {
              "name": "frontage",
              "label": "Pies de frente al agua",
              "widget": "number",
              "value_type": "int",
              "min": 0,
              "required": false
            },
            {
              "name": "lot",
              "label": "Lote (acres)",
              "widget": "number",
              "value_type": "float",
              "min": 0,
              "step": 0.01,
              "required": false
            },
            {
              "name": "year",
              "label": "Año de construcción",
              "widget": "number",
              "value_type": "int",
              "min": 1900,
              "max": 2100,
              "required": false
            },
            {
              "name": "listed",
              "label": "Fecha de publicación",
              "widget": "datetime",
              "format": "YYYY-MM-DD",
              "date_format": "DD/MM/YYYY",
              "time_format": false,
              "picker_utc": true,
              "default": "{{now}}",
              "required": false,
              "hint": "Las más recientes salen primero."
            }
          ]
        },
        {
          "name": "en",
          "label": "Textos en inglés",
          "widget": "object",
          "collapsed": true,
          "required": false,
          "hint": "Si lo deja vacío, la web en inglés muestra el texto en español.",
          "fields": [
            {
              "name": "title",
              "label": "Título en inglés",
              "widget": "string",
              "required": false
            },
            {
              "name": "desc",
              "label": "Descripción en inglés",
              "widget": "text",
              "required": false
            },
            {
              "name": "features",
              "label": "Características en inglés",
              "widget": "text",
              "required": false,
              "hint": "Una por línea."
            }
          ]
        }
      ]
    },
    {
      "name": "web",
      "label": "Textos y datos de la web",
      "label_singular": "Sección",
      "description": "Los textos, fotos y datos de contacto de la web. Pulse una sección, cambie lo que necesite y pulse \"Publicar\". Si deja vacío un texto en inglés, la web en inglés usa el español.",
      "delete": false,
      "editor": {
        "preview": false
      },
      "files": [
        {
          "name": "contacto",
          "label": "Datos de contacto",
          "file": "agencia/data/web/contacto.json",
          "fields": [
            {
              "name": "marca",
              "label": "Nombre de la inmobiliaria",
              "widget": "object",
              "fields": [
                {
                  "name": "nombre",
                  "label": "Nombre",
                  "widget": "string",
                  "hint": "Sale en el logo, en los títulos de las páginas y en el pie. Ej.: Ingrid Realtor"
                },
                {
                  "name": "lema",
                  "label": "Lema debajo del nombre",
                  "widget": "string",
                  "required": false,
                  "hint": "Ej.: Bienes raíces en Florida"
                },
                {
                  "name": "lema_en",
                  "label": "Lema en inglés",
                  "widget": "string",
                  "required": false
                }
              ]
            },
            {
              "name": "telefono",
              "label": "Teléfono",
              "widget": "string",
              "hint": "Ej.: 786 626 4910. Sale en la cabecera, en Contacto y en el botón Llamar."
            },
            {
              "name": "whatsapp",
              "label": "WhatsApp",
              "widget": "string",
              "required": false,
              "hint": "Déjelo vacío si es el mismo número que el teléfono."
            },
            {
              "name": "email",
              "label": "Correo",
              "widget": "string"
            },
            {
              "name": "oficina",
              "label": "Oficina",
              "widget": "object",
              "fields": [
                {
                  "name": "calle",
                  "label": "Dirección (calle y número)",
                  "widget": "string",
                  "required": false,
                  "hint": "Opcional. Ej.: 1234 Cape Coral Pkwy E, Suite 5"
                },
                {
                  "name": "ciudad",
                  "label": "Ciudad",
                  "widget": "string"
                },
                {
                  "name": "estado",
                  "label": "Estado",
                  "widget": "string",
                  "default": "FL"
                },
                {
                  "name": "cp",
                  "label": "Código postal",
                  "widget": "string",
                  "required": false
                }
              ]
            },
            {
              "name": "licencia",
              "label": "Número de licencia",
              "widget": "string",
              "hint": "Ej.: SL3644016. Sale en Sobre mí y en el pie de página."
            },
            {
              "name": "agencia",
              "label": "Nombre de la agencia (broker)",
              "widget": "string",
              "required": false,
              "hint": "En Florida la publicidad debe llevar el nombre de la agencia. Sale en el pie de página."
            },
            {
              "name": "titulo",
              "label": "Título de la sección Contacto",
              "widget": "string"
            },
            {
              "name": "texto",
              "label": "Texto de la sección Contacto",
              "widget": "text"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "texto",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "formularios",
              "label": "Dirección de envío de los formularios (avanzado)",
              "widget": "string",
              "required": false,
              "hint": "La dirección que le da su servicio de formularios (por ejemplo Formspree) para recibir los mensajes de la web en su correo. Vacío: los formularios no envían."
            }
          ]
        },
        {
          "name": "portada",
          "label": "Portada",
          "file": "agencia/data/web/portada.json",
          "fields": [
            {
              "name": "eyebrow",
              "label": "Línea pequeña de arriba",
              "widget": "string",
              "hint": "Ej.: Bienes raíces de lujo en Florida"
            },
            {
              "name": "frase",
              "label": "Frase principal",
              "widget": "text"
            },
            {
              "name": "subtitulo",
              "label": "Texto debajo",
              "widget": "text"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "frase",
                  "label": "Frase principal en inglés",
                  "widget": "text",
                  "required": false
                },
                {
                  "name": "subtitulo",
                  "label": "Texto debajo en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "cifras",
              "label": "Cifras (la franja con números)",
              "widget": "object",
              "collapsed": true,
              "fields": [
                {
                  "name": "mostrar",
                  "label": "Mostrar las cifras",
                  "widget": "boolean",
                  "default": true,
                  "required": false
                },
                {
                  "name": "lista",
                  "label": "Cifras",
                  "label_singular": "cifra",
                  "widget": "list",
                  "max": 4,
                  "required": false,
                  "summary": "{{fields.numero}} {{fields.texto}}",
                  "fields": [
                    {
                      "name": "numero",
                      "label": "Número",
                      "widget": "string",
                      "hint": "Ej.: 214, $1.2B o 38%"
                    },
                    {
                      "name": "texto",
                      "label": "Texto",
                      "widget": "string",
                      "hint": "Ej.: casas vendidas"
                    },
                    {
                      "name": "texto_en",
                      "label": "Texto en inglés",
                      "widget": "string",
                      "required": false
                    }
                  ]
                }
              ]
            },
            {
              "name": "caminos",
              "label": "¿Qué necesitas? (Comprar, Alquilar, Vender)",
              "widget": "object",
              "collapsed": true,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña de arriba",
                  "widget": "string"
                },
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "comprar",
                  "label": "Tarjeta Comprar",
                  "widget": "object",
                  "fields": [
                    {
                      "name": "titulo",
                      "label": "Título",
                      "widget": "string"
                    },
                    {
                      "name": "texto",
                      "label": "Texto",
                      "widget": "text"
                    }
                  ]
                },
                {
                  "name": "alquilar",
                  "label": "Tarjeta Alquilar",
                  "widget": "object",
                  "fields": [
                    {
                      "name": "titulo",
                      "label": "Título",
                      "widget": "string"
                    },
                    {
                      "name": "texto",
                      "label": "Texto",
                      "widget": "text"
                    }
                  ]
                },
                {
                  "name": "vender",
                  "label": "Tarjeta Vender",
                  "widget": "object",
                  "fields": [
                    {
                      "name": "titulo",
                      "label": "Título",
                      "widget": "string"
                    },
                    {
                      "name": "texto",
                      "label": "Texto",
                      "widget": "text"
                    }
                  ]
                },
                {
                  "name": "en",
                  "label": "Textos en inglés",
                  "widget": "object",
                  "collapsed": true,
                  "required": false,
                  "fields": [
                    {
                      "name": "eyebrow",
                      "label": "Línea pequeña en inglés",
                      "widget": "string",
                      "required": false
                    },
                    {
                      "name": "titulo",
                      "label": "Título en inglés",
                      "widget": "string",
                      "required": false
                    },
                    {
                      "name": "comprar",
                      "label": "Comprar en inglés",
                      "widget": "object",
                      "required": false,
                      "fields": [
                        {
                          "name": "titulo",
                          "label": "Título",
                          "widget": "string",
                          "required": false
                        },
                        {
                          "name": "texto",
                          "label": "Texto",
                          "widget": "text",
                          "required": false
                        }
                      ]
                    },
                    {
                      "name": "alquilar",
                      "label": "Alquilar en inglés",
                      "widget": "object",
                      "required": false,
                      "fields": [
                        {
                          "name": "titulo",
                          "label": "Título",
                          "widget": "string",
                          "required": false
                        },
                        {
                          "name": "texto",
                          "label": "Texto",
                          "widget": "text",
                          "required": false
                        }
                      ]
                    },
                    {
                      "name": "vender",
                      "label": "Vender en inglés",
                      "widget": "object",
                      "required": false,
                      "fields": [
                        {
                          "name": "titulo",
                          "label": "Título",
                          "widget": "string",
                          "required": false
                        },
                        {
                          "name": "texto",
                          "label": "Texto",
                          "widget": "text",
                          "required": false
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "name": "google",
              "label": "Google y enlaces compartidos",
              "widget": "object",
              "collapsed": true,
              "hint": "El título y la descripción que salen en Google y al compartir la web por WhatsApp. Escriba {marca} donde quiera el nombre de la inmobiliaria.",
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "descripcion",
                  "label": "Descripción",
                  "widget": "text"
                },
                {
                  "name": "titulo_en",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "descripcion_en",
                  "label": "Descripción en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "vecindarios",
          "label": "Vecindarios",
          "file": "agencia/data/web/vecindarios.json",
          "fields": [
            {
              "name": "eyebrow",
              "label": "Línea pequeña de arriba",
              "widget": "string"
            },
            {
              "name": "titulo",
              "label": "Título de la sección",
              "widget": "string"
            },
            {
              "name": "intro",
              "label": "Texto de la sección",
              "widget": "text"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "intro",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "zonas",
              "label": "Vecindarios",
              "label_singular": "vecindario",
              "widget": "list",
              "min": 1,
              "summary": "{{fields.nombre}}",
              "hint": "Salen en la portada, en el buscador y en el formulario de cada propiedad. Arrástrelos para cambiar el orden.",
              "fields": [
                {
                  "name": "nombre",
                  "label": "Nombre",
                  "widget": "string"
                },
                {
                  "name": "id",
                  "label": "Identificador",
                  "widget": "string",
                  "pattern": [
                    "^[a-z0-9-]+$",
                    "Solo minúsculas, números y guiones"
                  ],
                  "hint": "Ej.: cape-coral. Si ya hay propiedades en este vecindario, no lo cambie."
                },
                {
                  "name": "texto",
                  "label": "Descripción",
                  "widget": "text"
                },
                {
                  "name": "foto",
                  "label": "Foto",
                  "widget": "image",
                  "required": false,
                  "choose_url": false,
                  "hint": "Vertical, de unos 1000 × 1250 píxeles."
                },
                {
                  "name": "mapa",
                  "label": "Centro en el mapa",
                  "widget": "map",
                  "type": "Point",
                  "decimals": 5,
                  "required": false,
                  "hint": "Pulse en el centro del vecindario. Se usa para las propiedades sin ubicación propia."
                },
                {
                  "name": "portada",
                  "label": "Mostrar en la portada",
                  "widget": "boolean",
                  "default": true,
                  "required": false,
                  "hint": "Si lo desactiva, sigue en el buscador pero no sale en la portada."
                },
                {
                  "name": "nombre_en",
                  "label": "Nombre en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "texto_en",
                  "label": "Descripción en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "servicios",
          "label": "Cómo trabajamos (Comprar y vender)",
          "file": "agencia/data/web/servicios.json",
          "fields": [
            {
              "name": "eyebrow",
              "label": "Línea pequeña de arriba",
              "widget": "string"
            },
            {
              "name": "titulo",
              "label": "Título de la sección",
              "widget": "string"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                }
              ]
            },
            {
              "name": "comprar",
              "label": "Pestaña Comprar",
              "label_singular": "punto",
              "widget": "list",
              "summary": "{{fields.titulo}}",
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "texto",
                  "label": "Texto",
                  "widget": "text"
                },
                {
                  "name": "titulo_en",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "texto_en",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "vender",
              "label": "Pestaña Vender",
              "label_singular": "punto",
              "widget": "list",
              "summary": "{{fields.titulo}}",
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "texto",
                  "label": "Texto",
                  "widget": "text"
                },
                {
                  "name": "titulo_en",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "texto_en",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "exterior",
              "label": "Pestaña Desde el exterior",
              "label_singular": "punto",
              "widget": "list",
              "summary": "{{fields.titulo}}",
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "texto",
                  "label": "Texto",
                  "widget": "text"
                },
                {
                  "name": "titulo_en",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "texto_en",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "valoracion",
          "label": "Valor de su casa",
          "file": "agencia/data/web/valoracion.json",
          "fields": [
            {
              "name": "eyebrow",
              "label": "Línea pequeña de arriba",
              "widget": "string"
            },
            {
              "name": "titulo",
              "label": "Título",
              "widget": "string"
            },
            {
              "name": "texto",
              "label": "Texto",
              "widget": "text"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "texto",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "sobre-mi",
          "label": "Sobre nosotros",
          "file": "agencia/data/web/sobre-mi.json",
          "fields": [
            {
              "name": "foto",
              "label": "Foto en la llave",
              "widget": "image",
              "choose_url": false,
              "required": false,
              "hint": "Opcional. Si la deja vacía, la llave sale solo con el marco dorado. Si pone una, cuadrada y de al menos 560 × 560 píxeles."
            },
            {
              "name": "eyebrow",
              "label": "Línea pequeña de arriba",
              "widget": "string"
            },
            {
              "name": "titulo",
              "label": "Título",
              "widget": "string"
            },
            {
              "name": "parrafos",
              "label": "Párrafos",
              "label_singular": "párrafo",
              "widget": "list",
              "min": 1,
              "summary": "{{fields.texto}}",
              "fields": [
                {
                  "name": "texto",
                  "label": "Texto",
                  "widget": "text"
                },
                {
                  "name": "texto_en",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "idiomas",
              "label": "Idiomas",
              "widget": "string"
            },
            {
              "name": "especialidad",
              "label": "Especialidad",
              "widget": "string"
            },
            {
              "name": "fundadora",
              "label": "Fundadora o agente principal",
              "widget": "object",
              "fields": [
                {
                  "name": "nombre",
                  "label": "Nombre",
                  "widget": "string",
                  "hint": "Sale en Sobre nosotros, en cada propiedad (\"Tu agente\") y en el pie con la licencia."
                },
                {
                  "name": "cargo",
                  "label": "Cargo",
                  "widget": "string",
                  "hint": "Ej.: Fundadora y agente"
                },
                {
                  "name": "cargo_en",
                  "label": "Cargo en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "foto",
                  "label": "Foto",
                  "widget": "image",
                  "choose_url": false,
                  "hint": "Retrato cuadrado, con la cara en el centro."
                }
              ]
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "idiomas",
                  "label": "Idiomas en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "especialidad",
                  "label": "Especialidad en inglés",
                  "widget": "string",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "testimonios",
          "label": "Testimonios",
          "file": "agencia/data/web/testimonios.json",
          "fields": [
            {
              "name": "mostrar",
              "label": "Mostrar los testimonios",
              "widget": "boolean",
              "default": true,
              "required": false
            },
            {
              "name": "eyebrow",
              "label": "Línea pequeña de arriba",
              "widget": "string"
            },
            {
              "name": "titulo",
              "label": "Título",
              "widget": "string"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                }
              ]
            },
            {
              "name": "lista",
              "label": "Testimonios",
              "label_singular": "testimonio",
              "widget": "list",
              "summary": "{{fields.iniciales}} · {{fields.quien}}",
              "fields": [
                {
                  "name": "texto",
                  "label": "Lo que dice el cliente",
                  "widget": "text"
                },
                {
                  "name": "iniciales",
                  "label": "Iniciales",
                  "widget": "string",
                  "hint": "Ej.: M.P."
                },
                {
                  "name": "quien",
                  "label": "Quién es",
                  "widget": "string",
                  "hint": "Ej.: Vendedores, Cape Coral"
                },
                {
                  "name": "texto_en",
                  "label": "Lo que dice, en inglés",
                  "widget": "text",
                  "required": false
                },
                {
                  "name": "quien_en",
                  "label": "Quién es, en inglés",
                  "widget": "string",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "pagina-propiedades",
          "label": "Página de propiedades",
          "file": "agencia/data/web/pagina-propiedades.json",
          "fields": [
            {
              "name": "titulo",
              "label": "Título",
              "widget": "string"
            },
            {
              "name": "texto",
              "label": "Texto debajo del título",
              "widget": "text"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "texto",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "google",
              "label": "Google y enlaces compartidos",
              "widget": "object",
              "collapsed": true,
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "descripcion",
                  "label": "Descripción",
                  "widget": "text"
                },
                {
                  "name": "titulo_en",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "descripcion_en",
                  "label": "Descripción en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "guias",
          "label": "Guías",
          "file": "agencia/data/web/guias.json",
          "fields": [
            {
              "name": "eyebrow",
              "label": "Línea pequeña de arriba",
              "widget": "string"
            },
            {
              "name": "titulo",
              "label": "Título de la página",
              "widget": "string"
            },
            {
              "name": "intro",
              "label": "Texto de la página",
              "widget": "text"
            },
            {
              "name": "en",
              "label": "Textos en inglés",
              "widget": "object",
              "collapsed": true,
              "required": false,
              "fields": [
                {
                  "name": "eyebrow",
                  "label": "Línea pequeña en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "titulo",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "intro",
                  "label": "Texto en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "guias",
              "label": "Guías",
              "label_singular": "guía",
              "widget": "list",
              "summary": "{{fields.titulo}}",
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "id",
                  "label": "Identificador",
                  "widget": "string",
                  "pattern": [
                    "^[a-z0-9-]+$",
                    "Solo minúsculas, números y guiones"
                  ],
                  "hint": "Para los enlaces, por ejemplo guias.html#comprar. No lo cambie si ya se usa."
                },
                {
                  "name": "intro",
                  "label": "Texto de entrada",
                  "widget": "text"
                },
                {
                  "name": "pasos",
                  "label": "Pasos",
                  "label_singular": "paso",
                  "widget": "list",
                  "summary": "{{fields.titulo}}",
                  "fields": [
                    {
                      "name": "titulo",
                      "label": "Título",
                      "widget": "string"
                    },
                    {
                      "name": "texto",
                      "label": "Texto",
                      "widget": "text"
                    },
                    {
                      "name": "titulo_en",
                      "label": "Título en inglés",
                      "widget": "string",
                      "required": false
                    },
                    {
                      "name": "texto_en",
                      "label": "Texto en inglés",
                      "widget": "text",
                      "required": false
                    }
                  ]
                },
                {
                  "name": "boton",
                  "label": "Texto del botón",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "enlace",
                  "label": "Enlace del botón",
                  "widget": "string",
                  "required": false,
                  "hint": "Ej.: properties.html?op=rent"
                },
                {
                  "name": "titulo_en",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "intro_en",
                  "label": "Texto de entrada en inglés",
                  "widget": "text",
                  "required": false
                },
                {
                  "name": "boton_en",
                  "label": "Botón en inglés",
                  "widget": "string",
                  "required": false
                }
              ]
            },
            {
              "name": "preguntas",
              "label": "Preguntas frecuentes",
              "label_singular": "pregunta",
              "widget": "list",
              "summary": "{{fields.pregunta}}",
              "fields": [
                {
                  "name": "pregunta",
                  "label": "Pregunta",
                  "widget": "string"
                },
                {
                  "name": "respuesta",
                  "label": "Respuesta",
                  "widget": "text"
                },
                {
                  "name": "pregunta_en",
                  "label": "Pregunta en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "respuesta_en",
                  "label": "Respuesta en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "glosario",
              "label": "Glosario",
              "label_singular": "palabra",
              "widget": "list",
              "summary": "{{fields.termino}}",
              "fields": [
                {
                  "name": "termino",
                  "label": "Palabra",
                  "widget": "string"
                },
                {
                  "name": "definicion",
                  "label": "Qué significa",
                  "widget": "text"
                },
                {
                  "name": "termino_en",
                  "label": "Palabra en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "definicion_en",
                  "label": "Qué significa, en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            },
            {
              "name": "google",
              "label": "Google y enlaces compartidos",
              "widget": "object",
              "collapsed": true,
              "fields": [
                {
                  "name": "titulo",
                  "label": "Título",
                  "widget": "string"
                },
                {
                  "name": "descripcion",
                  "label": "Descripción",
                  "widget": "text"
                },
                {
                  "name": "titulo_en",
                  "label": "Título en inglés",
                  "widget": "string",
                  "required": false
                },
                {
                  "name": "descripcion_en",
                  "label": "Descripción en inglés",
                  "widget": "text",
                  "required": false
                }
              ]
            }
          ]
        },
        {
          "name": "calculadora",
          "label": "Calculadora de hipoteca",
          "file": "agencia/data/web/calculadora.json",
          "fields": [
            {
              "name": "entrada",
              "label": "Entrada (%)",
              "widget": "number",
              "value_type": "float",
              "min": 0,
              "max": 100,
              "step": 1,
              "hint": "El porcentaje del precio que se paga al comprar. Ej.: 20"
            },
            {
              "name": "interes",
              "label": "Tipo de interés anual (%)",
              "widget": "number",
              "value_type": "float",
              "min": 0,
              "max": 25,
              "step": 0.05,
              "hint": "Póngalo al día de vez en cuando. Ej.: 6.5"
            },
            {
              "name": "plazo",
              "label": "Plazo (años)",
              "widget": "number",
              "value_type": "int",
              "min": 10,
              "max": 30,
              "step": 5,
              "hint": "30, 20, 15 o 10."
            },
            {
              "name": "impuestos",
              "label": "Impuestos de la propiedad (% al año)",
              "widget": "number",
              "value_type": "float",
              "min": 0,
              "max": 10,
              "step": 0.1,
              "hint": "En Florida suele estar entre 1 y 2. Ej.: 1.8"
            },
            {
              "name": "seguro",
              "label": "Seguro de hogar (% al año)",
              "widget": "number",
              "value_type": "float",
              "min": 0,
              "max": 10,
              "step": 0.1,
              "hint": "Ej.: 0.6"
            }
          ]
        }
      ]
    }
  ]
};

export default config;
