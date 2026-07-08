## WINF ERP

Sistema de gestión integral para WINF (Williams Informática). Ver `WINF-ERP-Plan-Maestro.md` para el plan completo por fases y `CLAUDE.md` para el contexto del proyecto.

### Setup

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear un proyecto en [Supabase](https://supabase.com) y copiar las credenciales a `.env.local` (ver `.env.example` para la lista completa):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

3. Correr la migración inicial (`supabase/migrations/0001_init.sql`) contra el proyecto, ya sea con la CLI:

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

   o pegando el contenido del archivo en el SQL Editor del dashboard de Supabase.

4. Crear el primer usuario (admin) desde Authentication → Users en el dashboard de Supabase. El trigger `on_auth_user_created` le crea automáticamente su `profile`.

5. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

### Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Auth + Postgres + Storage) · Framer Motion · Zod · Zustand.
