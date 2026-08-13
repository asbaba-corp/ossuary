#!/usr/bin/env bash
set -euo pipefail

# `@ossuary/core` é publicado por `exports` apontando para `dist/`, que não
# existe num clone novo. Sem compilar antes, o Metro falha a resolução e o
# navegador mostra uma página em branco — o erro só aparece no log do bundler,
# então é fácil perder tempo procurando no lugar errado. Compilar aqui é a
# diferença entre `pnpm web` funcionar de primeira e não funcionar.
#
# `tsc` é incremental o bastante para isso custar pouco a cada start, e é mais
# seguro que testar a existência de `dist/`: um `dist` velho quebra igual, só
# que de um jeito mais confuso.

# Chama o mesmo gerenciador que invocou este script. Rodando via corepack, o
# `pnpm` pode não estar no PATH, e um `pnpm` cru falharia com "command not found".
PM="${npm_execpath:-}"
if [ -n "$PM" ] && [ -f "$PM" ]; then
  run() { node "$PM" "$@"; }
elif command -v pnpm >/dev/null 2>&1; then
  run() { pnpm "$@"; }
elif command -v corepack >/dev/null 2>&1; then
  run() { corepack pnpm "$@"; }
else
  echo "erro: pnpm não encontrado. Instale com 'corepack enable'." >&2
  exit 1
fi

echo "› compilando @ossuary/core…"
run --filter @ossuary/core build

echo "› iniciando o laboratório web…"
run --filter @ossuary/app web "$@"
