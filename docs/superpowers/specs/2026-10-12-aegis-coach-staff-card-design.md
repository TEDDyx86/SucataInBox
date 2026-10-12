# Aegis no Coach Staff — Design

## Objetivo

Adicionar Aegis à categoria **Coaches** da página Coach Staff, reaproveitando o card existente e exibindo suas redes confirmadas/informadas.

## Decisão de design

- Nome exibido: **Aegis**.
- Categoria: `Coach`.
- Instagram: `https://www.instagram.com/gabriel.aegis1/`.
- X: `https://x.com/Aegislol1`.
- Kick: `https://kick.com/aegislol1` (handle informado pelo usuário).
- O card segue o layout atual, sem imagem nova; avatar ao vivo e indicador de live continuam sendo fornecidos pelo fluxo Kick existente.

## Implementação esperada

Adicionar o registro à lista `COACH_STAFF` em `src/data/coach-staff.ts`. O agrupamento da página, os links com ícones e a consulta de live já são derivados dessa lista, portanto não se espera alteração de componentes nem de banco de dados.

## Verificação

- Confirmar o novo registro como `Coach`, com URLs corretas e handle Kick `aegislol1`.
- Executar TypeScript, lint e testes existentes.
- Confirmar que o nome aparece no grupo Coaches e que os três links são gerados pelo helper social.

## Fora de escopo

Alterar o layout dos cards, adicionar biografia/estatísticas ou modificar outros perfis do Coach Staff.
