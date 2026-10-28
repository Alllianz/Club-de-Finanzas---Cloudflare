## Operating Rules

- Al iniciar cada sesion, preguntar siempre: "Estas trabajando desde Desktop o MacBook?"
- Antes de editar modelos/datos, verificar:
  - estado de migraciones (`npx prisma migrate status` en backend)
  - cliente prisma generado (`npx prisma generate`)
  - consistencia de variables locales (`DATABASE_URL`, `NEXT_PUBLIC_API_URL`)
- Si hay desfasaje entre equipos, priorizar sincronizar esquema y volver a generar cliente antes de continuar.
