# Catán · Crónicas

App para registrar partidas de mesa entre un grupo de amigos — de momento **Catán** (ganador individual) y **Mus** (por parejas) — sin login, pensada para usarse desde el móvil justo después de jugar. Producción: [juegos.proactivefuture.eu](https://juegos.proactivefuture.eu).

## Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router) + TypeScript, React 19
- **Estilos**: Tailwind CSS v4, tema medieval hecho a mano (fuentes Cinzel + EB Garamond, texturas, paleta propia por juego)
- **Animación**: Framer Motion (modales, confeti, transiciones)
- **Base de datos**: SQLite vía [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts)
  - En local: fichero `local.db` (se crea solo, no se versiona)
  - En producción: [Turso](https://turso.tech) (SQLite distribuido, plan gratuito)
- **Hosting**: [Vercel](https://vercel.com) (Hobby) — despliegue automático en cada `git push` a `main`
- **DNS**: Cloudflare (solo gestiona el subdominio `juegos.proactivefuture.eu` → Vercel; el dominio no se movió de sitio)

Todo el esquema (`src/lib/schema.sql`) se crea y migra solo al arrancar (`ensureSchema()` en `src/lib/db.ts`), tanto en local como en Turso — no hace falta ejecutar migraciones a mano.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin variables de entorno no hace falta nada más: usa un SQLite local (`file:./local.db`) que se regenera solo.

```bash
npm run build   # build de producción (Turbopack)
npx tsc --noEmit  # chequeo de tipos
```

## Variables de entorno (solo producción)

Configuradas en Vercel → Project → Settings → Environment Variables:

| Variable | Qué es |
|---|---|
| `TURSO_DATABASE_URL` | URL de la base de datos en Turso (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Token de autenticación (`turso db tokens create`) |

Ver `.env.example` para el formato.

## Estructura

```
src/
├── app/
│   ├── page.tsx                 Landing: elige entre Catán y Mus
│   ├── catan/                   Nueva partida + crónica + Sala de la Fama de Catán
│   ├── mus/                     Nueva partida + crónica + Sala de la Fama de Mus
│   ├── jugadores/                Listado y perfil de jugador (compartido entre juegos)
│   └── api/                     Rutas API (games, mus, players, stats)
├── components/                  Modales, tarjetas, iconos, confeti…
└── lib/
    ├── schema.sql                Esquema de la base de datos
    ├── db.ts                     Cliente libSQL + migraciones automáticas
    └── types.ts                  Tipos compartidos
```

Los jugadores son compartidos entre Catán y Mus (misma tabla `players`); las estadísticas de cada juego se calculan por separado filtrando por columna `game` y `counts_for_stats` (permite marcar una partida como "amistosa", que queda en el histórico pero no cuenta para el ranking).
