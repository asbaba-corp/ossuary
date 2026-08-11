# Motor determinístico de auto-cast

## Entregue

- Adicionado estado runtime puro de mana, mana máxima e cooldowns por spell.
- Adicionado avanço imutável de cooldowns por duração explícita.
- Adicionada avaliação de várias spells na prioridade do loadout.
- Tentativas bloqueadas são registradas; a oportunidade para no primeiro
  disparo elegível.
- Disparo atualiza apenas mana e cooldown da spell escolhida.
- Adicionado botão no Lab para avaliar o loadout configurado e inspecionar os
  eventos produzidos.

## Limites preservados

- Nenhum alvo, inimigo concreto ou definição de conteúdo foi adicionado.
- O motor não aplica dano, proteção ou controle.
- `resolveCombat`, loop idle, recompensas, save e servidor continuam fora do
  escopo.

## Verificação executada

- Smoke test de prioridade, fallback para a próxima spell, consumo de mana e
  cooldown ✅
- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- `pnpm build:web` ✅
