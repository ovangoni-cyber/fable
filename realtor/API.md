# API de la web

La API permite que otras herramientas (Claude u otro asistente, Zapier, un CRM, un programa propio) lean y cambien **toda la web**, igual que el panel:

- Propiedades: crear, cambiar y quitar.
- Textos y datos: contacto, portada y cifras, vecindarios, Cómo trabajo, Valor de su casa, Sobre mí, testimonios y la página de propiedades.
- Fotos y vídeos: subir, listar y borrar.

Funciona dentro de la misma web en Netlify, sin servidor aparte: `https://sudominio.com/api`. Cada cambio se guarda en GitHub, igual que el panel, y Netlify vuelve a publicar la web en uno o dos minutos. Todo queda en el historial de GitHub y se puede deshacer.

La API comprueba los datos con las mismas reglas que el panel (`admin/config.mjs`): campos obligatorios, números, opciones válidas, vecindarios que existen… Si algo no cuadra, no guarda nada y explica qué campo corregir. Solo puede tocar los datos de la web, nunca el código.

## Activarla (una sola vez)

1. **Token de GitHub.** En GitHub: *Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token*.
   - *Repository access*: **Only select repositories** → el repositorio de la web.
   - *Permissions → Repository permissions → Contents*: **Read and write**. Nada más.
   - Elija una fecha de caducidad y copie el token.
2. **Clave de la API.** Invente una clave larga y difícil, de al menos 32 caracteres. Por ejemplo, genérela con `openssl rand -hex 32`. Es la que darán a cada herramienta. Se pueden usar varias claves separadas por comas, una por herramienta, para poder retirar una sin afectar a las demás.
3. **Netlify.** En el sitio: *Site configuration → Environment variables → Add a variable*.
   - `API_KEY`: la clave del paso 2.
   - `GITHUB_TOKEN`: el token del paso 1.
   - Opcional: `GITHUB_REPO` y `GITHUB_BRANCH`. Por defecto se usan los del panel (`ovangoni-cyber/fable` y `main`).
4. Vuelva a publicar el sitio (*Deploys → Trigger deploy*). Compruebe que funciona:

   ```sh
   curl https://sudominio.com/api/web/contacto -H "Authorization: Bearer SU_CLAVE"
   ```

Para retirar el acceso, cambie o borre `API_KEY` en Netlify y vuelva a publicar.

**Seguridad.** La clave da acceso a cambiar la web. No la publique ni la pegue en páginas web o código que vea el público; úsela solo en herramientas de confianza. Si se filtra, cámbiela en Netlify.

## Cómo se usa

Todas las peticiones, salvo `GET /api`, llevan la cabecera `Authorization: Bearer SU_CLAVE` (o `X-API-Key: SU_CLAVE`). Los datos van y vienen en JSON.

| Petición | Qué hace |
|---|---|
| `GET /api` | Lista de rutas. No pide clave. |
| `GET /api/esquema` | Todos los campos de cada parte de la web: tipo, si son obligatorios, opciones y ayuda. |
| `GET /api/propiedades` | Resumen de todas las propiedades. Con `?completo=1`, todos los datos. |
| `GET /api/propiedades/{id}` | Una propiedad. |
| `POST /api/propiedades` | Crea una propiedad. El id sale de la referencia: `IC-2620` → `ic-2620`. |
| `PUT /api/propiedades/{id}` | Reemplaza la propiedad entera. |
| `PATCH /api/propiedades/{id}` | Cambia solo los campos enviados. `null` borra un campo opcional. |
| `DELETE /api/propiedades/{id}` | Quita la propiedad. |
| `GET /api/web` | Lista de secciones: `contacto`, `portada`, `vecindarios`, `servicios`, `valoracion`, `sobre-mi`, `testimonios`, `pagina-propiedades`. |
| `GET /api/web/{seccion}` | Los textos y datos de una sección. |
| `PUT /api/web/{seccion}` | Reemplaza la sección entera. |
| `PATCH /api/web/{seccion}` | Cambia solo los campos enviados. |
| `GET /api/medios` | Fotos y vídeos subidos. |
| `POST /api/medios` | Sube una foto o un vídeo (máximo 4,5 MB). Devuelve la `ruta` para usar en las propiedades. |
| `DELETE /api/medios/{nombre}` | Borra una foto o un vídeo. |

Los nombres de los campos son los del panel. `GET /api/esquema` los lista todos. Los principales de una propiedad son: `title`, `ref`, `status` (`sale`, `new`, `contract`, `sold`, `private`, `rent`), `type` (`house`, `condo`, `penthouse`), `area` (el `id` de un vecindario de `GET /api/web/vecindarios`), `price`, `beds`, `baths`, `sqft`, `imgs`, `video_url`, `video_file`, `desc`, `features` (una por línea), `exclusive`, `featured`, `details` y `en` (textos en inglés).

### Ejemplos

Cambiar la oficina:

```sh
curl -X PATCH https://sudominio.com/api/web/contacto \
  -H "Authorization: Bearer SU_CLAVE" -H "Content-Type: application/json" \
  -d '{"oficina": {"calle": "1234 Cape Coral Pkwy E", "cp": "33904"}}'
```

Subir una foto y crear una propiedad con ella:

```sh
curl -X POST "https://sudominio.com/api/medios?nombre=canal-1.jpg" \
  -H "Authorization: Bearer SU_CLAVE" -H "Content-Type: image/jpeg" --data-binary @canal-1.jpg
# → {"ruta": "/img/propiedades/canal-1.jpg", …}

curl -X POST https://sudominio.com/api/propiedades \
  -H "Authorization: Bearer SU_CLAVE" -H "Content-Type: application/json" \
  -d '{"title": "Casa en canal con salida al Golfo", "ref": "IC-2620", "status": "new", "type": "house",
       "area": "cape-coral", "price": 1250000, "beds": 4, "baths": 3, "sqft": 2800,
       "imgs": ["/img/propiedades/canal-1.jpg"], "desc": "…", "features": "Muelle\nPiscina"}'
```

Marcar una propiedad como vendida:

```sh
curl -X PATCH https://sudominio.com/api/propiedades/ic-2620 \
  -H "Authorization: Bearer SU_CLAVE" -H "Content-Type: application/json" -d '{"status": "sold"}'
```

### Respuestas

- `200` / `201`: hecho. Incluye los datos guardados y el `commit` de GitHub. Si lo enviado no cambia nada, responde `"sin_cambios": true` y no guarda.
- `400`: datos no válidos. `detalles` dice qué campo y por qué.
- `401`: falta la clave o no es correcta.
- `404`: no existe esa propiedad, sección o archivo.
- `409`: ya existe, o el archivo cambió a la vez desde el panel (vuelva a leerlo y repita), o se intenta quitar un vecindario que todavía tiene propiedades.
- `413`: archivo de más de 4,5 MB. Para vídeos, use un enlace de YouTube o Vimeo en `video_url`.
- `502` / `503`: falta configurar `API_KEY` o `GITHUB_TOKEN`, o GitHub rechazó el token.

## Con Claude

Dele a Claude la dirección de la API y una clave propia para él, y pídale los cambios en lenguaje normal. Por ejemplo: "Usa la API de https://sudominio.com/api con esta clave. Lee primero GET /api/esquema. Cambia el teléfono a 239 555 0100 y marca la IC-2611 como vendida". Claude puede hacerlo desde cualquier entorno donde pueda enviar peticiones HTTP, como Claude Code o una integración propia.

## Para desarrolladores

- Código: `netlify/functions/api/api.mjs` (Netlify Functions, Node 18 o superior, sin dependencias). Se publica en `/api` y `/api/*` (`export const config`).
- Las reglas de los campos salen de `admin/config.mjs`, el mismo archivo que usa el panel. Si cambia un campo del panel, la API lo sigue sin tocar nada más.
- Lee y escribe con la API de contenidos de GitHub (`/repos/{repo}/contents/{ruta}`), con el `sha` de cada archivo para no pisar cambios hechos a la vez desde el panel.
- Las pruebas se hacen con un GitHub simulado sobre una copia del repositorio: crear, cambiar y borrar, validación, conflictos, subida de archivos, permisos y la reconstrucción de la web con los datos nuevos.
