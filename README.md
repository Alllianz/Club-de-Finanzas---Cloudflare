# Club de Finanzas UBA - Despliegue en Cloudflare Workers & D1

Esta versión del proyecto está configurada para exportación estática (`output: 'export'`) y backend serverless con base de datos SQLite distribuida globalmente en **Cloudflare Workers & D1** usando **Wrangler**.

---

## 📋 Requisitos Previos

- **Node.js**: Versión 20 o superior.
- **Wrangler**: Cloudflare Developer Platform CLI (incluido en `devDependencies`).
- Cuenta en [Cloudflare](https://dash.cloudflare.com/).

---

## 🚀 Comandos Principales

### 1. Desarrollo Local
Para levantar el servidor de desarrollo de Next.js:
```bash
npm run dev
```

### 2. Generar el Build Estático
Compila el proyecto y genera los archivos estáticos en la carpeta `out/`:
```bash
npm run build
```

### 3. Despliegue a Cloudflare Workers mediante Wrangler
Despliega el worker con los assets estáticos y la base D1 conectada:
```bash
npx wrangler deploy
```

---

## ⚙️ Arquitectura en Producción

- **Worker Name**: `club-de-finanzas---cloudflare`
- **Assets Directory**: `./out` (Static HTML export con Next.js Turbopack)
- **Database**: Cloudflare D1 (`clubdefinanzas-db`, ID: `71ce5760-f1c7-4a7b-831d-255ce894f363`)
- **API Endpoints**: `/api/members/register` procesado nativamente por `worker/index.ts`
