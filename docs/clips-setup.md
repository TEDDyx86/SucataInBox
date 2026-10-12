# Configuração do módulo de clipes

O módulo usa Supabase Auth/Postgres para contas e metadados e Cloudflare R2 privado para playlists, segmentos e thumbnails. As chaves de serviço são usadas apenas no servidor.

## 1. Supabase

1. Configure um projeto Supabase e desative o cadastro público em **Authentication → Sign In / Providers → Allow new users to sign up**.
2. Execute as migrations `supabase/migrations/202610070001_clips.sql`, `supabase/migrations/202610070002_clip_player_assignment.sql`, `supabase/migrations/202610070003_twitch_clip_sources.sql` e `supabase/migrations/202610120001_community_clip_submissions.sql`, nessa ordem, no SQL Editor ou via Supabase CLI. Em uma instalação existente com as três primeiras aplicadas, aplique somente a migration comunitária. Ela habilita `pg_cron` e agenda a remoção periódica dos hashes temporários de rate limit; confirme que a extensão `pg_cron` está disponível no projeto Supabase.
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

Depois do primeiro login, o admin pode criar/remover contas e atribuir funções em `/admin/users`. Ao criar um usuário, defina uma senha inicial e compartilhe-a por um canal privado. Moderadores e admins podem importar clipes diretamente ou revisar a fila comunitária em `/admin/clips`; o jogador é identificado pelo canal da Kick ou pelo login do broadcaster Twitch. A atribuição pode ser corrigida na lista de clipes. O cadastro público de contas continua fechado.

### Submissões comunitárias de clipes

Qualquer pessoa pode enviar um link público de clipe da Kick ou Twitch pelo botão **Enviar clipe** em `/clips`, sem criar conta nem fornecer email. O formulário confirma apenas o recebimento; não há notificações nem consulta pública de status. O apelido é opcional e só aparece no clipe publicado quando o remetente marcou o consentimento explícito.

As submissões ficam em `public.clip_submissions`, com RLS habilitado e sem políticas de acesso para `anon` ou `authenticated`. Somente rotas server-side usam a chave `SUPABASE_SERVICE_ROLE_KEY`, depois de validação/autorização. A tabela pública `clips` continua sendo a fonte da galeria e suas políticas expõem somente linhas `published`.

O endpoint limita cada IP a cinco tentativas válidas por janela móvel de uma hora. Ele HMACa o IP recebido no `X-Forwarded-For` confiável da plataforma e grava somente o hash, nunca o endereço puro. A migration agenda via `pg_cron` a limpeza dos registros expirados. Honeypot, validação estrita dos hosts/plataformas, deduplicação e limite de corpo complementam o rate limit; não há CAPTCHA.

Na fila, admins e moderadores podem aprovar, tentar novamente falhas ou rejeitar. A aprovação usa os importadores atuais e publica o clipe só após concluir o processamento; uma falha fica oculta e disponível para retry. Processamentos parados por mais de dois minutos podem ser recuperados. Rejeitar exige confirmação e remove permanentemente a submissão, o registro de clipe criado por ela e os objetos parciais do R2. A limpeza nunca apaga um clipe importado diretamente pelo staff que tenha o mesmo link. Após publicar, a submissão transitória é apagada e permanecem apenas o clipe e, havendo consentimento, o apelido público.

Não é necessária uma nova variável de ambiente no deploy: o rate limit usa a chave server-side já existente `SUPABASE_SERVICE_ROLE_KEY`. Aplique e valide a migration no Supabase antes de publicar as novas rotas e páginas.

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
