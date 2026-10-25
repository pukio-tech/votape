# Sistema de Votación Electoral Estudiantil

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL

Voto único por token, voto secreto y emisión atómica. Pensado para un único proceso electoral.

## Puesta en marcha

```bash
npm install
cp .env.example .env        # completar DATABASE_URL, SESSION_SECRET, TOKEN_PEPPER, ADMIN_PASSWORD
npm run db:push             # crea las 8 tablas
npm run db:seed             # (opcional) datos DEMO: elección abierta + 30 votantes
npm run dev                 # http://localhost:3000
```

Los tokens de la demo quedan en `salida/tokens-demo.csv`.

| Ruta            | Qué es                                                      |
| --------------- | ----------------------------------------------------------- |
| `/`             | Ingreso con código de estudiante + token                    |
| `/votar`        | Cédula de votación (requiere sesión de votante)             |
| `/api/votar`    | `POST` que emite el voto dentro de `prisma.$transaction`    |
| `/admin`        | Resultados en vivo, participación, horario y estado         |

## Cargar la elección real

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
- **Fuerza bruta**: 10 intentos de ingreso / 10 min por IP; 5 intentos de admin / 15 min.
- **Auditoría**: ingresos, intentos fallidos, reintentos de voto, cambios de horario/estado en `AuditoriaLog`.
- La votación solo acepta votos si el estado es `EN_PROCESO` **y** la hora actual está dentro del horario.

## Producción

```bash
npm run build && npm start
```

Usar HTTPS (las cookies son `secure` en producción). El limitador de intentos vive en memoria,
así que está pensado para una sola instancia del servidor.
