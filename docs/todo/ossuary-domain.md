# Plano: domínio do Ossuary

## Objetivo

Implementar a meta-progressão permanente da conta como domínio puro,
independente de combate, inimigos e conteúdo concreto.

## Escopo

- Estado imutável de ossos, marcos e upgrades desbloqueados.
- Marcos abstratos por chave de espécie, sem definir bestiário.
- Bônus percentuais sobre derivados, nunca pontos de atributo.
- Transições para adicionar osso, registrar progresso e resgatar upgrade.
- Validação de custos, duplicatas, chaves e estado inválido.
- Consulta dos bônus efetivos para consumo futuro pelo cálculo de stats.

## Fora de escopo

- Drop ou definição de inimigos.
- Combate, loop idle e recompensas reais.
- Loja, ouro e integração econômica.
- UI final, save e servidor.

## Decisões preservadas

- Ossos são permanentes e não são gastos.
- Bônus do Ossuary alteram derivados por percentual.
- A origem concreta dos marcos será fornecida pelo conteúdo futuramente.

## Verificação

- Progressão monotônica e imutável.
- Upgrade não pode ser resgatado duas vezes.
- Estado não permite valores negativos ou bônus em atributos primários.
- Bônus acumulam de forma determinística.
