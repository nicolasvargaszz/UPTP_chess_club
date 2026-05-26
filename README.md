# UPTP_chess_club

App web estática para administrar un torneo suizo presencial de ajedrez del UPTP Chess Club.

- Emparejamientos suizos automáticos.
- Resultados protegidos por modo administrador local.
- Base de datos local con IndexedDB.
- Backup/importación JSON.
- Interfaz responsive para celular.

## Cómo usar el modo administrador

1. Abrí la página publicada o `index.html` en tu navegador.
2. Tocá el botón **Admin** arriba a la derecha.
3. La primera vez, escribí una clave de al menos 4 caracteres. Esa clave se guarda como hash en la base local del navegador.
4. En las siguientes visitas, tocá **Admin** y escribí la misma clave para desbloquear edición.
5. Con admin activo podés cargar resultados, editar jugadores, generar emparejamientos, importar/exportar backup y cambiar configuración.

## Cómo cargar resultados

1. Entrá como administrador.
2. Andá a **Partidas**.
3. En la partida pendiente elegí `1-0`, `0-1` o `0.5-0.5`.
4. Tocá **Guardar**.
5. Cuando ya no haya partidas pendientes, la app puede generar la siguiente ronda suiza automáticamente si la opción **Auto emparejar** está activa en **Base local**.

Si por horario no se pueden terminar todas las partidas de una ronda, entrá como admin en **Partidas** y usá **Generar adelanto**. Esa opción empareja solamente a jugadores que no tienen partidas pendientes y deja vivas las partidas atrasadas.

## Base de datos

GitHub Pages sirve archivos estáticos, así que esta versión guarda datos en **IndexedDB**, una base local del navegador. Eso significa que los cambios quedan guardados en tu computadora o celular, incluso al cerrar la página, pero no se sincronizan automáticamente con otros dispositivos.

Para una base compartida real entre todos los celulares/computadoras se necesita conectar un backend externo, por ejemplo Supabase, Firebase o una API propia.

## Conectar GitHub Pages con DigitalOcean + SQLite

Esta versión incluye un backend liviano en `server/`. Guarda todo en SQLite y expone una API para que el `index.html` sincronice los datos desde GitHub Pages.

### 1. Entrar al Droplet

```bash
ssh -i ~/.ssh/autobots_do_ed25519 root@24.199.127.101
```

### 2. Instalar dependencias

```bash
apt update
apt install -y git nodejs npm build-essential sqlite3
```

### 3. Descargar el proyecto

```bash
git clone https://github.com/nicolasvargaszz/UPTP_chess_club.git
cd UPTP_chess_club/server
npm install
```

### 4. Configurar la API

```bash
cp .env.example .env
nano .env
```

Usá algo así:

```bash
PORT=3000
JWT_SECRET=pega-aqui-un-secreto-largo
ADMIN_PASSWORD=tu-clave-admin
CORS_ORIGIN=https://nicolasvargaszz.github.io
```

Podés generar el secreto con:

```bash
openssl rand -hex 32
```

### 5. Levantar la API

```bash
npm start
```

Probá en el Droplet:

```bash
curl http://localhost:3000/api/health
```

### 6. Exponer con Cloudflare Tunnel sin dominio

En otra terminal SSH del Droplet:

```bash
wget -O cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared
./cloudflared tunnel --url http://localhost:3000
```

Cloudflare te va a dar una URL tipo:

```txt
https://algo-random.trycloudflare.com
```

### 7. Conectar la web

1. Abrí `https://nicolasvargaszz.github.io/UPTP_chess_club/`.
2. Tocá **Admin**.
3. En **URL de API remota**, pegá la URL `https://...trycloudflare.com`.
4. En **Clave administrador**, poné la clave de `ADMIN_PASSWORD`.
5. Tocá **Validar API**.

Desde ese momento los resultados se guardan en SQLite dentro del Droplet.

Nota: con Quick Tunnel la URL `trycloudflare.com` puede cambiar si reiniciás el túnel. Si cambia, volvés a entrar en **Admin** y pegás la nueva URL.

## Publicar la URL de API para todos

El archivo `api-config.json` puede guardar una URL pública de API:

```json
{
  "apiUrl": "https://tu-api.trycloudflare.com"
}
```

Si ese archivo tiene una URL, todos los visitantes de GitHub Pages intentan leer la base remota automáticamente. Si está vacío, la app usa la base local del navegador o la URL que el admin configure manualmente.

Con Quick Tunnel, si la URL cambia, se puede actualizar `api-config.json`, hacer commit/push y todos los visitantes usarán la nueva URL cuando GitHub Pages se actualice.

## Aplicar datos oficiales desde el Droplet

Para aplicar los cambios del 2026-05-26 directamente sobre SQLite:

```bash
cd ~/UPTP_chess_club
git pull
cd server
node scripts/apply-2026-05-26-updates.js
```

Ese script:

- Agrega a `Josue Hartman`.
- Marca `Oscar Martín Barrios Brizuela vs Diego Barrios` como victoria de Diego.
- Agrega/marca `Oscar Martín Barrios Brizuela vs Nicolás Vargas` como victoria de Oscar.
