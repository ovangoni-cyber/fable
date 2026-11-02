# Ingrid Realtor en un VPS propio — diseño

Fecha: 2026-11-02. Alcance: solo `agencia/` (web **Ingrid Realtor**). `realtor/`, `constructora/` e `inversionistas/` no cambian.

## Intención

Publicar la web de la agencia en el VPS de Hostealo del dueño del proyecto, con el dominio `ingrid-realtor.com`, en lugar de Netlify. El dueño no es programador: todos los cambios de contenido los pide en Claude Code y Claude los aplica, los comprueba y los sube. No habrá panel de administración al principio. Los mensajes de los formularios tienen que llegarle a Ingrid por correo.

## Objetivos

1. `https://ingrid-realtor.com` sirve la web con SSL válido y renovación automática. `http://` y `www.` redirigen a `https://ingrid-realtor.com` (sin `www`).
2. Los tres formularios (`#contact-form` y `#valuation-form` en `index.html`, `#enquire-form` en `property.html`) llegan por correo a `ingrid.realtor91@gmail.com` y se guarda una copia en el VPS.
3. Un comando en la computadora del dueño genera la web, ejecuta las comprobaciones y la sube. Se puede volver a la versión anterior con otro comando.
4. El VPS queda protegido: sin entrada con contraseña por SSH, cortafuegos y bloqueo de intentos repetidos.
5. Antes de publicar, la web lleva los datos legales y de buscadores que faltan (ver *Cambios en la web*).

## Fuera de alcance

- Panel de administración (Decap CMS) y API (`netlify/functions/api`): no se suben ni se ejecutan en el VPS. **No se borran del repositorio**: pueden volver más adelante. El bot de WhatsApp/Telegram sigue pospuesto.
- Netlify: no se configura. `netlify.toml` se queda como está.
- Cambiar las propiedades de ejemplo (Miami) por las de Cape Coral: es otra tarea.
- Correo propio en el dominio (buzones `@ingrid-realtor.com`).

## Antiobjetivos (sería un fracaso aunque funcione)

- Que un mensaje de un cliente se pierda sin rastro: si falla el correo, tiene que quedar en el registro del VPS.
- Que la web abierta con doble clic (`file://`) deje de funcionar: sigue siendo un requisito de `agencia/` (ver `CLAUDE.md`).
- Credenciales (contraseña de aplicación de Gmail, claves) dentro del repositorio o en el chat.
- Que una subida deje la web a medio actualizar o rota sin forma rápida de volver atrás.

## Datos decididos

| Dato | Valor |
| --- | --- |
| VPS | Hostealo, Ubuntu 26.04 LTS, IP `79.110.63.60`, 1 vCPU, 2 GB RAM, 24 GB disco. Recién instalado: sin Nginx, sin Node, `ufw` inactivo. Solo escucha el puerto 22. |
| Acceso | `root` por llave SSH (`~/.ssh/id_ed25519` de la computadora del dueño, ya autorizada). |
| Dominio | `ingrid-realtor.com`, comprado en IONOS. **Aún no apunta al VPS.** |
| Broker | BEST DEALS REALTY |
| Código postal de la oficina | 33904 (confirmado) |
| Correo de destino de los formularios | `ingrid.realtor91@gmail.com` |
| Envío del correo | SMTP de Gmail con contraseña de aplicación. La cuenta remitente está por decidir: la de Ingrid o una nueva para la web. |

## Cómo se hace

### En el VPS (una sola vez)

- **Usuario `deploy`** sin contraseña, con la misma llave SSH, dueño de `/var/www/ingrid-realtor`. Las subidas usan este usuario y no `root`.
- **SSH:** `PasswordAuthentication no`, `PermitRootLogin prohibit-password`. Hay que comprobar que la llave entra **antes** de reiniciar `sshd`.
- **Cortafuegos `ufw`:** 22, 80 y 443. **fail2ban** para `sshd`.
- **Actualizaciones de seguridad automáticas** (`unattended-upgrades`).
- **Nginx** sirve `/var/www/ingrid-realtor/current`, un enlace simbólico a la versión publicada. Cabeceras: `Cache-Control: no-cache` en `/data/`, igual que en `netlify.toml`, caché larga en `/img/` y `/css/`, gzip y las cabeceras básicas de seguridad. `404` propio si existe; si no, el de Nginx.
- **SSL:** certbot con el plugin de Nginx para `ingrid-realtor.com` y `www.ingrid-realtor.com`, con renovación automática. Solo se puede pedir cuando el DNS ya apunte al VPS.
- **Node LTS** desde el repositorio oficial de NodeSource o el paquete de Ubuntu si es ≥ 18.

### Servicio de formularios

- Un script Node pequeño en el VPS. Escucha en `127.0.0.1` y Nginx le pasa `POST /api/form`. Se gestiona con systemd, con su propio usuario sin privilegios y reinicio automático.
- El código vive en el repositorio, en `agencia/server/` (nombre a elección del builder), y se sube con la web. **No se publica como archivo estático.**
- **Entrada:** el `FormData` que ya envía `js/core.js` (`multipart/form-data`). Responde `200` con JSON si va bien y otro código si no. `core.js` ya muestra "enviado" o "error" según la respuesta.
- **Antispam:**
  - Un campo oculto (honeypot): si llega relleno, responde `200` sin enviar.
  - Límite de envíos por IP, por ejemplo 5 cada 10 minutos.
  - Tamaño máximo del cuerpo.
  - Solo campos de texto conocidos, con límite de longitud.
  - Solo acepta el `Origin` del propio dominio.
- **Correo:**
  - Asunto con el tipo de formulario (contacto, valoración o interés en una propiedad, con su referencia) y el nombre del cliente.
  - `Reply-To` con el correo del cliente.
  - Cuerpo en texto con todos los campos, la página de origen y el idioma.
- **Registro:** cada envío se añade como una línea JSON a un archivo del VPS, fuera de la carpeta pública, antes de intentar el correo, y se marca si el correo falló.
- **Credenciales** (usuario y contraseña de aplicación de Gmail, destinatario) en un archivo de entorno del VPS con permisos `600`, leído por systemd. Nunca en el repositorio.
- Una dependencia como mucho: `nodemailer`, o SMTP a mano si se prefiere no tener ninguna. `agencia/` no tiene `package.json`: si hace falta uno, que sea solo para `server/`.

### Cambios en la web (`agencia/`)

- `data/web/contacto.json`: `agencia` → `BEST DEALS REALTY` y `formularios` → `/api/form`. Después, `node scripts/build-site.js && node scripts/build-listings.js`. No se editan a mano las partes generadas (ver `CLAUDE.md`).
- Con `file://` el formulario no puede enviar a `/api/form`. Basta con que muestre el mensaje de error de siempre, o que `core.js` trate `file:` como "sin conectar". Que no rompa nada.
- `og:image` (y `og:url` si se añade) con la dirección absoluta `https://ingrid-realtor.com/...`, para que la vista previa salga en WhatsApp. Si se puede, que salga del dominio guardado en un solo sitio (por ejemplo, un campo nuevo en `contacto.json` aplicado por `build-site.js`), no repetido a mano en cada página.
- **Decisión del dueño: se publica oculta a los buscadores** mientras las propiedades, cifras y testimonios sean de ejemplo. Nginx envía `X-Robots-Tag: noindex, nofollow` en todo y `robots.txt` lleva `Disallow: /`. Debe bastar un único interruptor (por ejemplo, una variable en la configuración de Nginx o un archivo incluido) para abrirla cuando estén las casas reales de Cape Coral. Mientras tanto, el `sitemap.xml` se genera pero `robots.txt` no lo anuncia.
- `robots.txt` y `sitemap.xml` con las páginas públicas (`index`, `properties`, `guias`, `privacy` y cada `property.html?id=…` si el sitemap se genera desde `data/propiedades/`).
- `admin/config.mjs` → `site_url`/`display_url` a `https://ingrid-realtor.com`, aunque el panel no se use ahora.

### Subida (desde la computadora del dueño)

Un script en el repositorio, por ejemplo `agencia/scripts/deploy.sh`, ejecutable desde Git Bash en Windows:

1. Ejecuta el build y `node tests/api.test.mjs`. Se para si algo falla.
2. Prepara la lista de archivos públicos. **No sube** `admin/`, `netlify/`, `tests/`, `scripts/`, `*.md`, `netlify.toml` ni archivos de desarrollo.
3. Sube a `/var/www/ingrid-realtor/releases/<fecha-hora>/` con `rsync` si está disponible en Git Bash; si no, con `tar` por `ssh`.
4. Cambia el enlace `current` a la nueva versión de forma atómica, deja las 5 últimas y reinicia el servicio de formularios si cambió su código.
5. Comprueba que `https://ingrid-realtor.com/` responde `200`.

Otro comando, como `deploy.sh --rollback`, vuelve el enlace a la versión anterior.

*Decisión de Claude:* GitHub (`main`) es el registro de lo que está publicado. `deploy.sh` se niega a subir si, tras el build, hay cambios sin commit (ignorando los que solo son finales de línea, ver `CLAUDE.md`) o si `main` no está subido a GitHub. Cada versión del VPS guarda el hash del commit (por ejemplo, en `releases/<fecha-hora>/VERSION`). El flujo de cada cambio es: editar, build, comprobar, commit, push y deploy.

*Decisión de Claude:* por la IP (`http://79.110.63.60`) y por cualquier otro nombre, Nginx redirige a `https://ingrid-realtor.com`.

*Decisión de Claude:* los formularios llevan campos ocultos con el tipo de formulario, la página y el idioma, para que el correo diga de dónde viene. El registro de envíos se conserva 12 meses, de acuerdo con `privacy.html`, y después se borra.

### Lo que tiene que hacer el dueño

1. **DNS en IONOS:** registro `A` de `@` y de `www` a `79.110.63.60`, y quitar cualquier `AAAA` o redirección de IONOS que choque.
2. **Contraseña de aplicación de Gmail** para la cuenta remitente: hay que activar la verificación en 2 pasos. La escribe él mismo en el VPS o en un archivo local que se copia. No se pasa por el chat.

## Comprobación

- `curl -I` por `http`, `https`, `www` y la IP: redirecciones correctas y certificado válido.
- La web en español y en inglés, en escritorio y a 390 px: sin errores de JavaScript, con el mapa funcionando (OpenStreetMap con Referer real) y las fotos y `data/listings.json` cargando.
- Los tres formularios envían, el correo llega a Gmail y no a spam, y queda la línea en el registro. Con el honeypot relleno y con más de 5 envíos seguidos, no se manda correo.
- Con la contraseña de Gmail mal puesta, el envío queda en el registro marcado como fallido y el cliente ve el mensaje de error.
- `ssh` con contraseña rechazado y con llave aceptado. `ufw status` activo.
- `deploy.sh` dos veces seguidas no rompe nada, y `--rollback` vuelve a la versión anterior.
- El doble clic (`file://`) en `index.html` sigue funcionando.

## Lo que decide el builder

Nombres de carpetas y archivos del servidor, versión exacta de Node, formato del registro, texto exacto del correo, configuración fina de Nginx y fail2ban, y si el script de subida es Bash o Node. Tienen que respetar las convenciones del repositorio (`CLAUDE.md`): comentarios y mensajes de commit en inglés, explicaciones al dueño en español.

## Pendiente del dueño

- Cuenta de Gmail remitente: la de Ingrid o una nueva.
- Que el DNS apunte al VPS antes de pedir el certificado.
