# Correção da chave visual de itens repetidos

## Entregue

- A lista do inventário agora usa uma chave única por ocorrência renderizada,
  permitindo equipamentos repetidos com o mesmo `item.id` sem warnings/erros
  de chave duplicada no React.
- A identidade do domínio de itens não foi alterada.

## Verificação

- `pnpm typecheck` ✅
- `git diff --check` ✅
