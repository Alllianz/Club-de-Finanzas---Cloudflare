# Local setup (frontend + backend)

## 1) Elegi equipo al iniciar sesion

Pregunta obligatoria:

- "Estas en Desktop o MacBook?"

## 2) Backend (repo aparte)

Ruta: `I:\Coding\RoxiumLabs\Clientes\clubdefinanzas-backend`

```bash
cd I:\Coding\RoxiumLabs\Clientes\clubdefinanzas-backend
cp .env.example .env
docker compose up -d
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run dev
```

API esperada: `http://localhost:8000/api`

## 3) Frontend (este repo)

```bash
cd I:\Coding\RoxiumLabs\Clientes\clubdefinanzas
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api
npm run dev
```

## 4) DBeaver local

Conexion PostgreSQL:

- Host: `localhost`
- Port: `5432`
- Database: `clubdefinanzas-db`
- User: `postgres`
- Password: `postgres`
- SSL: disable

## 5) Checklist de consistencia entre Desktop/MacBook

1. `npx prisma migrate status` en backend.
2. `npx prisma generate` si cambiaste schema.
3. Confirmar `NEXT_PUBLIC_API_URL` en frontend.
4. Verificar que Docker tenga corriendo `clubdefinanzas-db`.
