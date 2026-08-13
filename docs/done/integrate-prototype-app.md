# Integrar prototype à aplicação

## Entregue

- A home Expo agora vive em `/` e usa `GameSession` com ticks, pausa,
  velocidade, save local e conteúdo do Vestíbulo.
- A nova tela React Native traz cena sidescroller estilizada, HUD, party,
  inventário, atributos, bestiário, ledger e controles do prototype.
- A cena carrega os spritesheets reais do cavaleiro e do Ignavo, com animações
  de idle, caminhada e ataque; espécies sem asset continuam com fallback.
- A run usa equipamento inicial, spell equipada/autocast e bônus do Ossuary ao
  montar os combatentes.
- O conteúdo principal deixou de usar `VERTICAL_FIXTURE_CONTENT`; fixtures
  continuam isolados na rota técnica `/lab`.
- O HTML `prototype/scene.html` foi restaurado como referência de comparação
  lado a lado; ele não é usado pela home nem pelo build Expo.
- README, design core e documentação do Vestíbulo foram atualizados.

## Diferenças remanescentes

- A cena usa componentes React Native; a migração do renderer para Skia ainda é
  uma etapa visual futura.
- Poções automáticas, slots pagos da party, drops por abate e a segunda fase de
  Caronte ainda precisam de domínio e balanceamento próprios.
- O miniboss da fase 5 e os números definitivos do Vestíbulo continuam abertos
  no design.

## Verificação

- `pnpm typecheck` passou.
- `pnpm test` passou via os checks recursivos disponíveis.
- `pnpm build:web` passou.
- `pnpm --filter @ossuary/core scenario` passou.
- `git diff --check` passou.
