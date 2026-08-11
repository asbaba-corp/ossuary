# Plano: laboratório de spells

## Objetivo

Adicionar ao laboratório Expo uma seção de teste da mecânica pura de spells,
sem fingir que existe combate.

## Trabalho

- Criar em `packages/core` o mínimo de domínio puro para validar definições,
  avaliar gatilhos, calcular potência e produzir uma tentativa determinística
  de auto-cast.
- Adicionar fixtures data-driven para dano, proteção e controle.
- Adicionar estado e comandos ao ViewModel do laboratório, mantendo JSX na
  View e regras no core.
- Renderizar uma seção explicitamente marcada como “teste — sem combate”, com
  seleção de spell, contexto, mana/HP/inimigos, avanço de cooldown e log de
  motivos/eventos.
- Atualizar a documentação de domínio e o documento de entrega com o que foi
  realmente testado.

## Fora de escopo

- `resolveCombat`, aplicação real a alvos, loop idle, aquisição ou slots.
- Alterar o loop existente do laboratório de XP/equipamento.

## Verificação

- Testes/checagens do core para gatilhos, mana, cooldown, escala e seed.
- `pnpm typecheck`.
- Verificação visual da seção no laboratório web.

## Entrega

- Adicionado `packages/core/src/spells.ts` com validação, gatilhos, escala,
  tentativa de auto-cast, cooldown e rolagem determinística de controle.
- Adicionadas fixtures de dano, proteção e controle ao laboratório.
- Adicionada a seção “Spells (teste isolado)” ao ViewModel/View, sem JSX ou
  estado de negócio no core e sem aplicar efeitos de combate.

## Verificação executada

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test puro do core para disparo, mana insuficiente, cooldown e seed
  determinística ✅
