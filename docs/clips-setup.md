# Configuração do módulo de clipes

O módulo usa Supabase Auth/Postgres para contas e metadados e Cloudflare R2 privado para playlists, segmentos e thumbnails. As chaves de serviço são usadas apenas no servidor.

## 1. Supabase

1. Configure um projeto Supabase e desative o cadastro público em **Authentication → Sign In / Providers → Allow new users to sign up**.
2. Execute as migrations `supabase/migrations/202610070001_clips.sql`, `supabase/migrations/202610070002_clip_player_assignment.sql` e `supabase/migrations/202610070003_twitch_clip_sources.sql`, nessa ordem, no SQL Editor ou via Supabase CLI. Em uma instalação que já aplicou as duas primeiras, aplique somente a terceira.
3. Crie o primeiro usuário no painel **Authentication → Users**. Use um email e senha inicial fortes.
4. Promova essa primeira conta a admin no SQL Editor, substituindo o email:

   ```sql
   insert into public.profiles (id, email, display_name, role)
   select
     id,
     email,
     coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)),
     'admin'
   from auth.users
   where lower(email) = lower('admin@example.com')
   on conflict (id) do update set role = 'admin';
   ```

5. Cadastre no ambiente do Next.js:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**somente servidor; nunca `NEXT_PUBLIC_`**)

Depois do primeiro login, o admin pode criar/remover contas e atribuir funções em `/admin/users`. Ao criar um usuário, defina uma senha inicial e compartilhe-a por um canal privado. Moderadores e admins podem adicionar clipes à fila em `/admin/clips`; o jogador é identificado pelo canal da Kick ou pelo login do broadcaster Twitch. A atribuição pode ser corrigida na lista de clipes. O cadastro público continua fechado.

## 2. Cloudflare R2

1. Mantenha `sucata-in-box-clips` privado e crie um token S3 com permissões de leitura, escrita e exclusão de objetos somente nesse bucket.
2. Configure as variáveis server-side:
   - `R2_ACCOUNT_ID`
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME=sucata-in-box-clips`
3. Configure a política CORS do bucket para as origens exatas do site. Exemplo para desenvolvimento; acrescente o domínio de produção do site:

   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://SEU-DOMINIO"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["Accept-Ranges", "Content-Length", "Content-Range", "ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

O bucket não precisa de domínio público: o app gera URLs assinadas curtas para entregar mídia de clipes publicados. O CORS permite que o player HLS do navegador siga os redirects para essas URLs.

## 3. Variáveis e execução

Copie os nomes de `.env.example` para `.env.local` e preencha localmente. Em produção, cadastre os mesmos valores nas variáveis do provedor de deploy. Não compartilhe nem versione os valores secretos.

```powershell
npm run dev
```

- Página pública: `/clips`
- Login staff: `/login`
- Gestão de clipes: `/admin/clips`
- Gestão de contas (admin): `/admin/users`

A importação de clipes da Kick aceita vídeos públicos de até 180 segundos e 100 MB. Ela copia playlist, segmentos e thumbnail para R2, preserva byte-ranges HLS e publica o clipe somente após concluir a cópia.

O endpoint público de metadados da Kick usado para resolver o link não faz parte de uma API documentada pela Kick. Se a Kick alterar ou bloquear esse endpoint/CDN, novas importações falharão até que o resolvedor seja atualizado; os clipes já copiados para o R2 continuam reproduzíveis. Para Twitch, o app usa a API Helix oficial para metadados e o embed oficial para reprodução; o vídeo permanece na Twitch e não é copiado ao R2.
