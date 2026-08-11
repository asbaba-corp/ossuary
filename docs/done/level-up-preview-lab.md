# Laboratório de level-up no preview

## Entregue

- `MechanicsLabScreen` adicionada como tela isolada e identificada como
  `TESTE`.
- Seção de personagem com nível, XP, barra de progresso e pontos disponíveis.
- Botão **Derrotar Ignavo** simula uma recompensa de combate de 15 XP usando o
  core compartilhado.
- Faixa de XP de teste entre 0 e 500, com botão para aplicar o valor escolhido,
  além do botão semântico de derrotar um Ignavo.
- Seção de atributos com distribuição via `spendAttributePoint`.
- Estado, derivados e comandos foram extraídos para
  `MechanicsLabViewModel.ts`, seguindo MVVM.
- A tela informa que o slider é somente uma ferramenta de inspeção e não faz
  parte da regra real do jogo.

## Decisão de mecânica

O fluxo que levaremos para o jogo é **derrotar monstro → ganhar XP → subir de
nível → distribuir pontos**. O ajuste manual de XP existe apenas para testar a
interface do preview.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:web` ✅
- `git diff --check` ✅
