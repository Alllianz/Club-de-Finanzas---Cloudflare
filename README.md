# Club de Finanzas UBA - Despliegue en Cloudflare Pages

Esta versión del proyecto está configurada para exportación estática (`output: 'export'`) y despliegue ultra rápido y global en **Cloudflare Pages** usando **Wrangler**.

---

## 🚀 Requisitos Previos

- **Node.js**: Versión 20 o superior.
- **Wrangler**: Cloudflare Developer Platform CLI (incluido en `devDependencies`).
- Cuenta en [Cloudflare](https://dash.cloudflare.com/).

---

## 🛠️ Comandos Principales

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

### 3. Vista previa local con Cloudflare Pages (Wrangler)
Simula el entorno de Cloudflare Pages localmente:
```bash
npm run preview
```

### 4. Despliegue a Cloudflare Pages mediante Wrangler
Despliega directamente la carpeta estática `out/` a Cloudflare Pages:
```bash
npm run deploy
```
*(Wrangler te solicitará iniciar sesión en Cloudflare en el navegador si es la primera vez que lo ejecutas).*

---

## ⚙️ Configuración para Despliegue Automatizado (Git + Cloudflare Pages Dashboard)

Cuando conectes este proyecto a un repositorio de GitHub/GitLab en el panel de Cloudflare Pages:

- **Framework preset**: `Next.js (Static HTML Export)` o `None`
- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Variables de entorno**:
  - `NODE_VERSION`: `20`
