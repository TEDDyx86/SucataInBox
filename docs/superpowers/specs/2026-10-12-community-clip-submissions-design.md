# Submissão comunitária e aprovação de clipes — Design

## Objetivo

Permitir que qualquer pessoa envie um link público de clipe Kick ou Twitch sem criar conta. Admins e moderadores revisam as submissões; somente itens aprovados são processados pelos importadores atuais e podem entrar na galeria pública.

## Decisões aprovadas

- O formulário fica na própria página `/clips` e aceita URL; a plataforma é detectada automaticamente.
- Nome/apelido (máximo 40 caracteres após trim) é opcional. Se preenchido, o remetente precisa consentir explicitamente com a exibição pública caso o clipe seja aprovado.
- Não se coleta e-mail, não se exige conta e não se informa o resultado da moderação após a confirmação de recebimento.
- Admins e moderadores podem aprovar ou rejeitar. O formulário de importação direta já existente para staff permanece como atalho.
- Limite de 5 envios por IP em uma janela móvel de uma hora; sem CAPTCHA. Honeypot, validação, deduplicação e rate limit no servidor complementam a proteção.
- Links inválidos, duplicados ativos e excesso de envios recebem mensagens próprias.
- Uma submissão pendente não aparece na galeria nem pode ser lida diretamente pelo navegador.
- Rejeitar é exclusão definitiva, sem estado ou histórico `rejected`. Se uma tentativa já tiver criado registro de clipe ou objetos no R2, esses recursos também são removidos.
- Falha no processamento mantém submissão e falha visíveis no painel para retry. Se o staff rejeitar uma falha, ela e seus dados/mídia parciais são removidos.
- No sucesso, o clipe publicado mantém o apelido autorizado; o registro transitório da submissão é apagado. Sem apelido, não há byline.

## Arquitetura

### Entrada pública

Adicionar formulário acessível por um CTA em `/clips`, com URL, apelido opcional e checkbox de consentimento condicional ao apelido. O servidor limita o corpo e o tamanho do apelido, normaliza espaços, valida os links exclusivamente com os parsers existentes da Kick e da Twitch e rejeita hosts/protocolos não permitidos. A rota não busca metadados, não baixa mídia e não chama os importadores.

O endpoint usa o cliente Supabase de serviço somente no servidor. A criação é feita por RPC transacional: calcula um HMAC-SHA-256 do IP fornecido pelo cabeçalho confiável da Vercel (com `SUPABASE_SERVICE_ROLE_KEY` como chave HMAC; nunca aceitar IP informado no body), serializa tentativas concorrentes, aplica o limite móvel de cinco por hora, verifica duplicados em submissões ativas e clipes existentes e insere o estado `pending`. Não guardar IP em texto puro. Uma tabela separada de rate limit guarda somente o hash e a expiração; hashes expiram em uma hora e o RPC limpa entradas expiradas. Duplicados podem ser enviados novamente depois da rejeição, porque a submissão anterior e qualquer registro de clipe associado foram apagados.

### Persistência e acesso

Criar `public.clip_submissions`, separada de `public.clips`, com: UUID, plataforma, ID e URL do clipe, apelido opcional, consentimento, estado (`pending`, `processing`, `failed`), erro seguro de processamento, `processing_started_at` e timestamps. O hash não fica na submissão: uma tabela separada o associa apenas ao contador de rate limit de uma hora. RLS fica habilitado sem política de leitura/escrita para `anon` ou `authenticated`. A rota pública só pode inserir através da RPC de submissão validada; rotas administrativas usam service role após autorização staff.

Adicionar à tabela `clips` campos opcionais `community_submitter_name` e `community_name_consent_at`. A consulta pública seleciona e renderiza o apelido apenas junto a clipes com `status = 'published'`. O clipe continua usando as colunas e regras atuais de reprodução: Kick copiado para R2; Twitch por embed oficial.

### Moderação e processamento

Em `/admin/clips`, adicionar uma fila privada de pendentes/falhas, separada do atalho staff existente. Cada item mostra link/plataforma, apelido consentido se existir, data, erro quando falhou e ações relevantes. Para evitar duplicar falhas na tela, a lista de importações exclui clipes cujo par plataforma/ID ainda esteja na fila comunitária; o clipe passa a aparecer nela quando a submissão é finalizada.

- **Aprovar:** claim atômico de `pending` → `processing`; chama `importKickClip` ou `importTwitchClip` já existentes. O autor comunitário é passado como metadado opcional. A finalização publica o clipe com apelido e timestamp de consentimento e apaga a submissão na mesma transação, para não deixar submissão órfã após publicação.
- **Falhar:** atualiza a submissão para `failed`, apresenta erro seguro e disponibiliza retry. O registro de clipe falho, se criado, permanece oculto pela regra pública existente.
- **Retry:** repete o importador idempotente para o mesmo clipe. Em caso de sucesso, publica e apaga a submissão.
- **Rejeitar/apagar:** confirma a ação, remove do R2 quaisquer objetos da tentativa, remove o registro de clipe correspondente e apaga a submissão. Falhas de limpeza devem manter o clipe oculto e permitir repetir a exclusão até a remoção completa.

Os Route Handlers de moderação exigem a sessão staff existente e aceitam tanto `admin` como `moderator`. Devem impedir dupla aprovação/rejeição concorrente por atualização condicional de estado. Submissões em processamento não podem ser rejeitadas simultaneamente. A rota de importação mantém o limite de execução atual de 60 segundos; depois de dois minutos, a tela de moderação apresenta um retry de recuperação e a API só permite a retomada se o `processing_started_at` ainda estiver vencido. Essa transição condicional recupera crashes/timeouts sem worker externo. Retry primeiro confere o clipe correspondente e é idempotente, sem criar publicação duplicada.

### Exibição pública

`PublishedClip` passa a incluir apelido comunitário opcional. O card exibe `Enviado por {apelido}` somente quando há nome consentido e o clipe está publicado. A ausência de nome não altera o layout atual. Não exibir contagem de submissões, links pendentes, erros internos ou dados de rate limit.

## Segurança, privacidade e falhas

- Usar somente host HTTPS e formatos de clipe já aceitos pelos parsers da Kick/Twitch; nunca aceitar URL arbitrária para fetch no servidor.
- Não expor a tabela de submissões nem usar chave service role no browser.
- O honeypot não substitui validação, rate limit ou deduplicação transacional. O nome é normalizado e limitado a 40 caracteres; se houver nome sem consentimento, rejeitar a requisição.
- Erros de provider, Supabase e R2 são sanitizados antes de aparecerem ao visitante; detalhes operacionais ficam restritos ao painel/log seguro.
- Uma rejeição concluída não deixa nome, URL, status ou histórico de moderação no banco. Se a remoção de mídia falhar, manter o item oculto como falha de limpeza e oferecer retry; apagar a submissão assim que a limpeza terminar. O hash temporário de rate limit fica desacoplado do conteúdo e expira em uma hora, como aprovado.
- Importação direta pelo staff continua funcionando sem byline comunitária.

## Verificação e testes

- Parsers e rota pública: URLs válidas Kick/Twitch, URL inválida/host proibido, campos excessivos, consentimento ausente com apelido, honeypot, duplicados e rate limit (incluindo requisições concorrentes).
- Banco/RLS: visitante não lê fila, não insere diretamente nem vê nomes pendentes; a RPC de envio é transacional e expira hashes após uma hora.
- Moderação: admin e moderador autorizados; não-staff recebe 401; rejeição apaga; dupla ação concorrente não duplica trabalho; falha mantém estado retryável; retry bem-sucedido publica uma única vez e remove submissão; exclusão remove metadados e mídia parcial.
- Galeria: apenas status `published`; apelido consentido é exibido, nome ausente não cria byline; rejeitados/pendentes/falhos continuam invisíveis.
- Verificações do projeto: testes Vitest, TypeScript, lint e build. Documentar a nova migration Supabase e qualquer configuração operacional em `docs/clips-setup.md`.

## Fora de escopo

- Contas ou notificações para remetentes.
- CAPTCHA ou revisão automática por IA.
- Alterar a importação direta atual do staff ou os players públicos Kick/Twitch.
- Guardar histórico de itens rejeitados.
