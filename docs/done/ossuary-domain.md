# Domínio do Ossuary

## Entregue

- Adicionado `OssuaryState` puro e imutável, com ossos, marcos e upgrades.
- Adicionadas transições para conceder ossos e registrar progresso por chave.
- Adicionada validação de estado e definições de upgrade.
- Adicionados requisitos por quantidade de ossos acumulados ou marcos.
- Adicionado desbloqueio único, sem consumir ossos.
- Adicionados bônus percentuais somados por derivado.
- Adicionada aplicação pura dos bônus sobre valores-base fornecidos pelo
  chamador.
- Adicionada seção test-only no Lab com fixtures artificiais e preview no
  personagem selecionado.

## Limites preservados

- Ossuary é estado de conta, não de personagem.
- Nenhum inimigo, drop, loot, combate ou economia foi implementado.
- O preview do Lab não altera os derivados reais do personagem.
- Não há save, servidor ou sincronização.

## Verificação executada

- Smoke test de osso, marco, requisito, desbloqueio único e preview ✅
- `pnpm build:core` ✅
- `pnpm typecheck` ✅
- `pnpm build:web` ✅
