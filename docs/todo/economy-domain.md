# Plano: fundação do domínio de economia

## Objetivo

Criar as transições puras de recursos e saldo de run antes de conectá-las a
combate, loot ou conteúdo de mundo.

## Escopo

- Saldos imutáveis por tipo de recurso.
- Recursos genéricos para ouro, poeira, materiais e preço de guardião.
- Crédito e débito com validação de valores.
- Transações atômicas com motivo/evento auditável.
- Saldo de run separado do saldo permanente da conta.
- Consulta de valor líquido e rejeição de débito sem fundos quando aplicável.

## Fora de escopo

- Drops, venda de equipamentos e inimigos.
- Preços finais e balanceamento de conteúdo.
- Poções, loja e compras de Ossuary.
- Combate, loop idle, save e servidor.

## Decisões preservadas

- Ouro é recurso de fluxo; poeira e ossos não têm o mesmo comportamento.
- O saldo de run poderá ficar negativo quando essa regra for explicitamente
  usada pelo chamador.
- O domínio não conhece a origem nem o destino semântico de uma transação.

## Verificação

- Transações são imutáveis e atômicas.
- Débitos inválidos não alteram o estado.
- Recursos desconhecidos e valores não finitos são rejeitados.
- Saldo de run e saldo permanente não se misturam.
