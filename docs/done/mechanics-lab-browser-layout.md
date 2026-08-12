# Organização do Mechanics Lab no navegador

## Entregue

- O Lab agora tem quatro áreas navegáveis: `Run / GameState`, `Personagem`,
  `Sistemas` e `Combate`.
- A área `Run / GameState` permite iniciar uma run fixture, avançar ticks de um
  segundo, observar wave/combate, ouro, recompensas e fases desbloqueadas, e
  reiniciar o cenário.
- O ViewModel mantém a aba ativa e o estado da run; a tela continua apenas
  renderizando o modelo e seus comandos.
- O `PhoneFrame` não cria moldura de telefone no web. Em iOS/Android, o shell
  nativo continua ocupando a tela inteira.

## Como testar no navegador

```bash
pnpm web
```

Abra `/lab` na URL do Expo e use `Run / GameState`:

1. Clique `Iniciar run`.
2. Use `Avançar 1s` para acompanhar a simulação passo a passo, ou `Resolver
   run` para executar até o limite offline da fixture.
3. Observe o status, wave, ouro, recompensas e eventos.
4. Quando a run estiver `completed`, `Iniciar run` inicia uma nova run; use
   `Reiniciar run` para voltar ao estado inicial.
5. Use as outras abas para inspecionar personagem, spells, Ossuary, economia
   e combate isolado.

Para gerar um bundle web de verificação:

```bash
pnpm --filter @ossuary/app build:web
```
