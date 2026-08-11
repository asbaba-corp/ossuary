# Fronteiras de módulos do core e laboratório

## Entrega

- O laboratório separa fixtures em `lab-fixtures.ts` e comandos de equipamento
  em `lab-equipment-commands.ts`.
- `packages/core/src/equipment.ts` virou uma fachada pública estável.
- O domínio expõe camadas nomeadas de loadout, stats e loot em
  `packages/core/src/equipment/`; cada camada tem uma API orientada à sua
  responsabilidade e o laboratório consome essas APIs.
- A implementação histórica foi preservada em `equipment/legacy.ts` durante a
  migração, evitando alteração de save/API e mantendo as regras centralizadas.

## Limite consciente

Os corpos internos ainda permanecem no legado nesta primeira PR de fronteiras;
a remoção gradual do legado pode ser feita em PRs menores, extraindo validação,
tipos e cada domínio sem alterar o contrato público.

## Verificação

- `pnpm build:core`
- `pnpm typecheck`
- smoke test da fachada e das camadas de domínio
- `git diff --check`
