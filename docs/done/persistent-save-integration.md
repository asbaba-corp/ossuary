# Integração de save local

## Entregue

- `ExpoSaveStore` persiste `SerializedSave` no `localStorage` web e no
  AsyncStorage de iOS/Android.
- O Mechanics Lab carrega um `GameSession` ao abrir, salva ações/ticks e
  restaura o estado após F5 ou reabertura do app.
- `Reiniciar run` limpa o save local e cria um estado novo.
- `pnpm web` abre somente o Expo Web; não inicia API, Supabase ou sync remoto.

## Uso local

```bash
pnpm web
```

Login, contas, servidor e sincronização remota ficam adiados até o produto
sair do modo dev. O `GameSession` mantém a porta de sync extensível para essa
etapa futura, mas o Lab atual usa exclusivamente o save local.

## Verificação

- `pnpm typecheck` ✅
- `expo export --platform web` ✅
