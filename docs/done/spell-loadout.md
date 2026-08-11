# Configuração de loadout de spells

## Entregue

- Adicionado ao core o domínio puro e imutável de `SpellLoadout`.
- Implementados equipar, remover, ativar/desativar e mover prioridade.
- Validados slots, duplicatas e IDs de spells disponíveis.
- Adicionada consulta das definições habilitadas na ordem do loadout.
- Adicionado um loadout independente por personagem no ViewModel do Lab.
- Adicionado painel test-only de configuração com duas vagas, mensagens de
  estado e controles de prioridade.

## Limites preservados

- Não há combate, loop idle, aplicação de dano/escudo/controle ou inimigos.
- Não há aquisição permanente, raridade/tier ou quantidade definitiva de
  slots; as três fixtures do Lab são sempre consideradas disponíveis.
- Não há save, servidor ou sincronização.

## Verificação executada

- Smoke test puro para equipagem, capacidade, imutabilidade, prioridade,
  remoção e filtragem de spells ativas ✅
- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Verificação de lint pendente: o workspace não possui script `lint` definido.
