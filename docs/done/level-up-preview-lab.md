# Laboratório de level-up no preview

## Entregue

- `MechanicsLabScreen` adicionada como tela isolada e identificada como
  `TESTE`.
- Seção de personagem com nível, XP, barra de progresso e pontos disponíveis.
- Botão **Derrotar Ignavo** simula uma recompensa de combate de 15 XP usando o
  core compartilhado.
- Controles de `+10 XP`, `−10 XP · teste` e reinício para inspeção rápida dos
  limiares.
- Seção de atributos com distribuição via `spendAttributePoint`.
- A tela informa que o botão de remover XP é somente visual e não faz parte da
  regra real do jogo.

## Decisão de mecânica

O fluxo que levaremos para o jogo é **derrotar monstro → ganhar XP → subir de
nível → distribuir pontos**. O ajuste manual de XP existe apenas para testar a
interface do preview.

## Verificação

- `pnpm typecheck` ✅
- `pnpm build:web` ✅
- `git diff --check` ✅
