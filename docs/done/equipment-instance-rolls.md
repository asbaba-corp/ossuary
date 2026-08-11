# Instâncias de equipamento e rolagem determinística de stats

## Entregue

- Equipamentos agora têm `id` do item-base e `instanceId` da peça concreta;
  fixtures antigas continuam funcionando com `instanceId` derivado de `id`.
- Adicionada a estrutura explícita de stats para dano/defesa base, defesa
  percentual, dano físico e de spell, crítico, lifesteal, mana steal,
  penetração e attack speed. Resistências por tipo de dano ficaram fora do
  escopo.
- Criado RNG puro e `rollEquipment` (também exportado como
  `rollEquipmentStats`), que escolhe deterministicamente valores inteiros não
  negativos de pools por atributo sem mutar a peça-base. Stats adicionais são
  preservados como dados explícitos.
- Inventário aceita equipamentos do mesmo item-base em slots distintos,
  rejeita `instanceId` duplicado e remove/consulta equipamentos por instância;
  consumíveis continuam empilhando por `item.id`.
- Loadout aceita desequipar por slot ou `instanceId` e mantém a peça concreta
  equipada.
- Laboratório Expo demonstra duas espadas do mesmo tipo, com seeds/valores
  diferentes, identidade por instância, inventário e equipar/desequipar.

## Verificação

- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- Smoke test público de rolagem determinística, pools inválidos, instâncias,
  remoção isolada e empilhamento de consumíveis ✅
- `git diff --check` ✅
- `pnpm lint` não existe nos scripts atuais do workspace; typecheck foi usado
  como verificação equivalente disponível.
