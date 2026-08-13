# Auditoria de mecânicas: prototype × Lab

## Já integrado na home

| Mecânica | Situação |
|---|---|
| Loop walking/combat/checkpoint | Usa `GameSession` e `GameState` |
| Combate automático determinístico | Usa o engine do core |
| XP, level-up e atributos | Usa o domínio de progressão |
| Equipamento e stats derivados | Loadout inicial e drops usam a fachada pública do domínio |
| Spells/autocast | Spell do Vestíbulo equipada no loadout e resolvida pelo combate |
| Ossuary | Bônus são fornecidos ao adaptador de combatentes |
| Inventário e drops | Recompensas são persistidas no `GameState` |
| Pause e velocidade | Comandos da home controlam os ticks da sessão |
| HUD, party, inventário, atributos e bestiário | Componentes da home |
| Sprites do herói e Ignavo | Spritesheets reais, com fallback visual para espécies sem asset |

## Mecânicas do prototype que não estavam completas no Lab

| Mecânica | Gap encontrado | Próximo domínio/teste |
|---|---|---|
| Poções HP/MP automáticas | O Lab só testa consumível de atributo; não existe runtime de HP/mana com limiar, tier e custo | `PotionPolicy` + estado de recursos de combate |
| Poção nunca deixa ouro negativo | O domínio de economia rejeita débito, mas não decide consumo automático e recuo | Comando de consumo atômico + testes de saldo |
| Recuo visual/econômico | O core tem ação de recuo/derrota, mas não a causa “sem ouro para poção” nem regeneração durante recuo | Evento de recuo por suprimento + cenário vertical |
| Gold por abate e poeira rara | O core atual recompensa por wave; o prototype registra cada abate e chance de poeira | Recompensa por `CombatEvent` + contadores de bestiário |
| Party com slots pagos | O Lab recruta diretamente; o prototype mostra slots bloqueados com preço | Domínio de recrutamento/economia + testes de preço |
| Ondas contínuas na mesma fase | O core trabalha com fases/waves de conteúdo e a home reinicia a marcha após conclusão | Conteúdo de farm contínuo e política de fase selecionada |
| Ledger detalhado da run | A home mostra income/expense agregado, mas não ainda loot, poções, recuos e poeira separados | Eventos econômicos tipados e painel de run |
| Bestiário com descrições e drops | A home mostra stats básicos; as descrições narrativas ainda não são dados compartilhados | Conteúdo de bestiário por espécie |

## Divergências de números

- As fórmulas do prototype e as fórmulas do Lab não são idênticas; o conteúdo do
  Vestíbulo agora usa os valores derivados do design/prototype como baseline.
- Os números de dano do bestiário continuam placeholders no documento do mundo.
- A fase 5 e a segunda fase de Caronte continuam decisões abertas de design.

Esses pontos não devem ser resolvidos duplicando lógica na UI. Cada mecânica
deve entrar no core, ganhar fixture/cenário no Lab e só então ser exposta na
home.
