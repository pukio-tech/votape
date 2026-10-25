# Sistema de Votación Electoral Estudiantil

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL

Voto único por token, voto secreto y emisión atómica. Pensado para un único proceso electoral.

## Puesta en marcha

```bash
npm install
cp .env.example .env        # completar DATABASE_URL, SESSION_SECRET, TOKEN_PEPPER, ADMIN_EMAIL, ADMIN_PASSWORD y AWS_* (S3)
npm run db:push             # crea las tablas
npm run db:seed             # (opcional) datos de ejemplo: elección abierta + 30 votantes
npm run dev                 # http://localhost:3000
```

Los tokens de ejemplo quedan en `salida/tokens-prueba.csv`.

| Ruta            | Qué es                                                      |
| --------------- | ----------------------------------------------------------- |
| `/`             | Ingreso con código de estudiante + token                    |
| `/votar`        | Cédula de votación (requiere sesión de votante)             |
| `/api/votar`    | `POST` que emite el voto dentro de `prisma.$transaction`    |
| `/resultados`   | Resultados públicos en vivo (barras por candidato, filtro por cargo) |
| `/api/resultados` | `GET` público con los conteos agregados (sin datos de votantes) |
| `/admin`        | Tablero de resultados (Administrador y Observador)          |
| `/admin/jornada` | Activar, pausar o finalizar la votación y fijar el horario (solo Administrador) |
| `/admin/candidatos` | Proceso, cargos y candidatos con foto (solo Administrador) |
| `/admin/votantes` | Padrón: tabla, búsqueda, alta/edición, tokens e importación CSV (solo Administrador) |
| `/admin/actividad` | Registro de auditoría con filtros (solo Administrador)   |
| `/admin/usuarios` | Alta, roles y acceso del personal del comité (solo Administrador) |

## Usuarios del comité

El primer ingreso a `/admin/login` crea automáticamente al administrador inicial con
`ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env` (también lo hacen `npm run db:seed` y `npm run admin:crear`).
Desde **Usuarios** se registra más personal con correo, contraseña y rol, se restablecen
contraseñas y se quita o devuelve el acceso (la sesión del usuario desactivado se corta al instante).

| Rol | Acceso |
| --- | --- |
| Administrador | Todo: resultados, jornada, actividad y usuarios |
| Observador | Solo el tablero de resultados |

Siempre debe quedar al menos un administrador activo, y nadie puede cambiar su propio rol ni desactivarse.
Las contraseñas se guardan con scrypt y cada acción queda en la auditoría con el nombre de su autor.

Si se pierde el acceso al panel:
```bash
npm run admin:crear -- --correo admin@admin.com --password NuevaClave2026
```
(restablece la contraseña y reactiva la cuenta; si el correo no existe, la crea).

## Fotos de candidatos (S3)

Las fotos se suben desde **Candidatos** al bucket S3 configurado en `AWS_S3_BUCKET`
(endpoint `AWS_ENDPOINT_URL_S3`). El navegador las reduce a 800 px antes de subirlas y la app
las sirve desde `/api/imagenes/...`, así el bucket no necesita ser público.

## Cargar la elección real

Lo normal es hacerlo desde el panel: **Jornada** o **Candidatos** para crear el proceso, cargos y
candidatos, y **Votantes** para registrar o importar el padrón (el CSV de tokens se descarga al importar).
También existen los scripts de línea de comandos:


1. **Candidatos**: copiar `datos/eleccion.ejemplo.json`, completar cargos/candidatos y poner las fotos
   en `public/candidatos/` (se referencian como `/candidatos/foto.jpg`).
   ```bash
   npm run eleccion:cargar -- datos/eleccion.json
   ```
   Queda en estado `CONFIGURACION`; se activa desde `/admin`.

2. **Padrón**: exportar el Excel como *CSV UTF-8* con las columnas `codigo, dni, nombres, apellidos, correo`
   (ver `datos/padron.ejemplo.csv`).
   ```bash
   npm run padron:importar -- datos/padron.csv
   ```
   Genera `salida/tokens-<fecha>.csv` con el token de cada votante. **Es la única copia en claro**:
   en la base de datos solo se guarda su hash. Volver a importar no toca a quien ya tiene token;
   `--regenerar` reemplaza los tokens aún no usados.

## Cómo se protege el proceso

- **Voto único**: la transacción marca el token `PENDIENTE → USADO` con un `UPDATE … WHERE estado = 'PENDIENTE'`.
  Si llegan dos envíos a la vez, PostgreSQL bloquea la fila y solo uno gana; el otro recibe `409`.
  `RegistroParticipacion.votanteId @unique` es una segunda barrera. Si algo falla, no se guarda nada.
- **Voto secreto**: la tabla `Voto` no tiene ninguna referencia al votante. Además su `id` es un UUID aleatorio
  (no un cuid, que lleva marca de tiempo), `fechaEmision` se trunca a la hora en punto y el orden de inserción
  se mezcla, para que no se pueda cruzar con `RegistroParticipacion` ni con `TokenAcceso.fechaUso`.
- **Tokens**: 10 caracteres sin ambiguos (~49 bits), guardados como HMAC-SHA256 con `TOKEN_PEPPER`.
  No cambies `TOKEN_PEPPER` después de generar los tokens.
- **Sesiones**: cookies `httpOnly`, `SameSite=strict`, firmadas con HMAC. La del votante dura 20 min.
- **Fuerza bruta**: 10 intentos de ingreso / 10 min por IP; en el panel, 8 por IP y 5 por correo cada 15 min.
- **Auditoría**: ingresos, intentos fallidos, reintentos de voto, cambios de horario/estado en `AuditoriaLog`.
- La votación solo acepta votos si el estado es `EN_PROCESO` **y** la hora actual está dentro del horario.

## Producción

```bash
npm run build && npm start
```

Usar HTTPS (las cookies son `secure` en producción). El limitador de intentos vive en memoria,
así que está pensado para una sola instancia del servidor.
