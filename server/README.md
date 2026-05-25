# UPTP Chess Club API

Backend liviano para sincronizar el torneo desde GitHub Pages.

## Desarrollo local

```bash
cd server
npm install
cp .env.example .env
npm start
```

## Variables

- `PORT`: puerto HTTP local, por defecto `3000`.
- `ADMIN_PASSWORD`: clave de administrador.
- `JWT_SECRET`: secreto largo para firmar sesiones.
- `CORS_ORIGIN`: origen permitido, por ejemplo `https://nicolasvargaszz.github.io`.

## Endpoints

- `GET /api/health`
- `GET /api/state`
- `POST /api/login`
- `PUT /api/state`

La base SQLite queda en `server/data/tournament.db`.
