# Núcleo de combate determinístico

## Entregue

- Contratos separados para snapshots, estado runtime, regras, eventos e resultados.
- Cálculo determinístico de dano físico com defesa, penetração, crítico e sustento.
- Motor de ticks com cooldown, alvo vivo estável e log reproduzível.
- Resolução limitada por quantidade máxima de ticks, com `victory` e `defeat`.
- Mana, cooldown e autocast por prioridade de loadout.
- Spells de dano, proteção temporária e controle temporário.
- Painel de teste no Lab com presets artificiais de vitória e derrota, avanço
  manual, resolução completa, HP, mana, efeitos, tempo, resultado e log.

## Fora deste milestone

Ondas, loot, recompensas, recuo, game loop, bestiário, persistência e
integração de party real continuam fora do núcleo.

## Verificação

- `pnpm build:core`
- `pnpm typecheck`
- `pnpm build:web`
- Smoke test manual do core: os presets resolvem respectivamente em vitória e derrota.
