# Plano: especificação do domínio de spells

## Objetivo

Fechar a mecânica data-driven de spells e efeitos sem implementar combate,
loop idle, aquisição de conteúdo ou slots de equipamento.

## Trabalho

- Atualizar `docs/design/core-design.md` na seção 4.6 com a mecânica de
  definição, auto-cast, mana, cooldown, gatilhos, escala e determinismo.
- Registrar explicitamente que a parte mecânica da Q14 está resolvida, mas
  aquisição, raridade/tier, número de spells equipadas e slots continuam
  abertas.
- Criar `docs/done/spell-domain-design.md` com o contrato de conteúdo, os
  payloads dos arquétipos dano/proteção/controle, regras de disparo e
  telemetria.
- Separar definição imutável, configuração do auto-cast, estado runtime e
  resolução futura pelo combate.
- Revisar os documentos afetados para não deixar a especificação anterior
  contraditória.

## Verificação

- Conferir referências a spells, Q14, mana e cooldown em todos os documentos.
- Validar que nenhum código de combate, loop offline ou aquisição foi
  alterado.
- Executar os checks adequados ao escopo documental, sem criar uma
  implementação de domínio prematura.

## Resultado

- `docs/design/core-design.md` agora fecha a mecânica de auto-cast, mana,
  cooldown, gatilhos, escala e determinismo; Q14 permanece parcial nas
  decisões de aquisição e equipagem.
- `docs/done/spell-domain-design.md` registra o contrato completo, os três
  arquétipos, a separação de camadas, casos-limite e telemetria.
- Nenhum código de combate, loop do laboratório, aquisição ou slot foi
  implementado.

## Verificação executada

- Varredura de `docs/design`, `docs/done` e documentos raiz para referências
  relacionadas: concluída.
- `git diff --check`: ✅
- Verificação de whitespace nos documentos alterados: ✅
- `pnpm typecheck`: ✅ (`packages/core` e `apps/expo`)
