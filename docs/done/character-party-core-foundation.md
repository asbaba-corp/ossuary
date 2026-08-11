# Fundação de personagens e party no core

## Entregue

- Adicionados `Character` e `Party` em `packages/core`, com party inicial de
  um personagem e limite de quatro membros.
- Implementadas criação, adição, remoção e reordenação imutáveis, incluindo
  validação de IDs duplicados, referências ausentes e tamanhos inválidos.
- XP é aplicado integralmente a todos os personagens ativos, reutilizando
  `gainExperience`; pontos de atributo podem ser gastos por personagem.
- Adicionados resumos de contagem, nível total, atributos agregados, pontos por
  personagem e `partyPower` como soma dos níveis, ainda sem significado de
  combate.
- API exportada pelo barrel público do core.
- O laboratório Expo agora recruta e seleciona vários personagens, exibe a
  party e demonstra XP compartilhado e distribuição independente de atributos,
  mantendo as transições no ViewModel.
- A decisão da Q27 foi resolvida: XP integral para cada slot ativo.

## Fora de escopo

Combate, caminhada, ondas, equipamento, spells, persistência, servidor e
fórmula definitiva de poder de combate.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test da API pública de criação, XP integral, imutabilidade e resumo ✅
