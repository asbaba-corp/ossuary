# Próxima etapa: composição de estado e contrato de combate

## Contexto para retomada

Este plano deve ser executado depois do merge do PR #20, que entrega o núcleo
de combate determinístico, mana/autocast, efeitos temporários, adaptação de um
personagem ao combate e inspeção do combate no Lab.

Esta branch contém somente o plano. Ela parte da `main` anterior ao PR #20 de
propósito: o PR de implementação deve ser revisado e mergeado primeiro; só
então este plano deve ser executado em uma nova branch baseada na `main`
atualizada.

## Objetivo da etapa

Preparar as fronteiras definitivas entre personagem, party, conteúdo, runtime
de combate, futuro `GameState` e documentação. Ao final, o combate deve receber
uma party real e uma onda realista de combatants derivados, sem carregar estado
persistente dentro do runtime e sem depender de fixtures para representar o
personagem do jogador.

O game loop ainda não será implementado nesta etapa. A finalidade é deixar os
contratos prontos para que o loop possa apenas orquestrar tempo, caminhada,
waves, combate, loot, recompensas, economia e recuo.

## Pré-condições

- PR #20 mergeado na `main`.
- Branch nova criada a partir da `main` atualizada.
- Confirmar que os tipos e nomes entregues pelo PR #20 continuam sendo a API
  real; se houver divergência, atualizar este plano antes de implementar.
- Ler `AGENTS.md`, `apps/expo/AGENTS.md`, `docs/design/core-design.md`,
  `plano-tecnico-idle-ios.md` e os documentos de domínio relacionados.

## Resultado arquitetural esperado

```text
Save/GameState persistente
├── account
│   ├── economy
│   ├── ossuary
│   └── inventory
├── roster
│   ├── characters: Character[]
│   ├── equipmentLoadouts: CharacterLoadout[]
│   └── spellLoadouts: SpellLoadout[]
├── party
│   └── activeCharacterIds / ordem dos membros
├── world
│   ├── fases liberadas
│   └── fase selecionada para farm
└── metadata
    ├── saveVersion
    ├── seq
    ├── deviceId
    └── lastSeenAt

Conteúdo imutável
├── definições de spells
├── definições de inimigos
├── waves
├── fórmulas e regras de combate
└── tabelas de loot/recompensa

Runtime transitório
├── CombatState
│   ├── HP atual
│   ├── mana atual
│   ├── cooldowns
│   └── efeitos temporários
└── estado da wave em execução
```

O `CombatantSnapshot` é derivado de um `CharacterBuild` ou de uma definição
de inimigo. Ele não é o save, não é o `GameState` e não deve carregar cópias
desnecessárias de conteúdo.

---

## TODO 1 — Criar composição persistível de personagem

### O que fazer

Criar um contrato explícito para representar o conjunto de dados que pertence
a um personagem jogável, sem transformar `Character` em dono das regras de
equipamento ou spells.

Introduzir uma composição equivalente a:

```ts
interface CharacterBuild {
  readonly character: Character;
  readonly equipment: CharacterLoadout;
  readonly spells: SpellLoadout;
}
```

Definir também como o `RosterState` localizará essa composição por
`characterId`, evitando arrays paralelos sem validação espalhados pelo
ViewModel.

### Por que

Hoje o Lab mantém `Party`, `CharacterLoadout[]` e `spellLoadouts[]` em estados
separados. O adaptador consegue combiná-los para um combate, mas ainda não
existe um contrato canônico que o futuro save possa serializar e validar.

### Para que

Para que uma alteração de equipamento, spell ou progressão seja encontrada
sempre no mesmo personagem e para que o futuro `GameState` não dependa de
convenções implícitas de arrays no cliente.

### Como

- Manter `Character` responsável por identidade e progressão.
- Manter equipamento responsável por `CharacterLoadout` e ownership no
  inventário.
- Manter spells responsável por `SpellLoadout`.
- Criar um módulo de composição/roster com validação de referências e IDs.
- Decidir se `Party` passa a guardar apenas IDs ordenados ou se continua
  contendo objetos; registrar a decisão e evitar duas fontes de verdade.
- Preservar helpers de compatibilidade caso a API pública atual seja usada por
  equipamento ou Lab.
- Não incluir HP/mana/cooldowns nessa composição: esses valores são runtime.

### Critérios de aceite

- Um personagem pode ser localizado com seus loadouts sem arrays paralelos
  frágeis.
- Referência a personagem inexistente ou loadout de outro personagem falha.
- A composição é imutável e validável.
- `Party` continua responsável por membros ativos e ordem, sem absorver regras
  de equipamento, spells ou combate.
- O contrato pode ser convertido em JSON sem funções ou referências de UI.

### Arquivos prováveis

- `packages/core/src/character.ts`
- `packages/core/src/party.ts`
- novo módulo de roster/build;
- `packages/core/src/equipment/*`
- `packages/core/src/spell-loadout.ts`
- `apps/expo/mechanics-lab/MechanicsLabViewModel.ts`

---

## TODO 2 — Fazer a party completa gerar combatants

### O que fazer

Estender o adaptador atual para receber a party ativa inteira e produzir um
combatant por personagem ativo, preservando a ordem da party. O adversário
deve ser recebido como uma coleção de definições/snapshots de inimigos, não
como um alvo hardcoded do Lab.

O contrato desejado é conceitualmente:

```ts
createCombatantsFromParty(partyBuild, combatContext): CombatantSnapshot[]
```

### Por que

O modo atual `Party selecionada` usa apenas um personagem real e um inimigo
artificial. Isso não testa a mecânica principal do jogo: party de 1–4
personagens contra uma wave.

### Para que

Para validar desde já:

- XP compartilhado em party real;
- mana e autocast de todos os membros;
- ordem e composição da party;
- múltiplos combatants vivos;
- derrota somente quando todo o lado da party estiver derrotado;
- custo futuro de poção proporcional à party;
- PVP party versus party no mesmo motor.

### Como

- Separar `partyBuild` do `CombatState`.
- Iterar os IDs/membros ativos na ordem definida pela party.
- Resolver equipamento, efeitos de item, atributos, derivados e spells de cada
  personagem individualmente.
- Criar uma camada equivalente para inimigos, inicialmente com fixtures
  artificiais, mas sem adicionar bestiário definitivo ao core.
- Manter os presets unitários de vitória/derrota/efeitos para testar o motor
  isoladamente.
- Adicionar ao Lab um cenário de party com 1, 2 e 4 personagens.
- Mostrar no Lab qual build originou cada combatant.

### Critérios de aceite

- Recrutar um personagem no Lab altera o lado da party no combate quando ele é
  ativado.
- Equipamento e spells de cada membro são refletidos no snapshot correto.
- A ordem da party é determinística.
- Uma party com múltiplos membros pode vencer depois de perder um membro.
- A derrota só ocorre quando nenhum membro da party está vivo.
- O mesmo seed, roster, party e wave produz o mesmo log.

### Arquivos prováveis

- `packages/core/src/combat/character-adapter.ts`
- novo módulo de composição da party para combate;
- `packages/core/src/combat/types.ts`
- `apps/expo/mechanics-lab/lab-fixtures.ts`
- `apps/expo/mechanics-lab/MechanicsLabViewModel.ts`
- `apps/expo/MechanicsLabScreen.tsx`

---

## TODO 3 — Separar conteúdo, snapshot e runtime

### O que fazer

Revisar `CombatantSnapshot`, `CombatSpellSetup` e `CombatState` para que cada
camada contenha apenas o que é de sua responsabilidade.

Separar explicitamente:

1. conteúdo imutável: definições de spells, inimigos, waves e regras;
2. configuração persistente: IDs de spells equipadas, ordem e habilitação;
3. snapshot derivado: stats prontos para a batalha;
4. runtime: HP, mana atual, cooldowns e efeitos ativos;
5. log: eventos reproduzíveis para animação/auditoria.

### Por que

O snapshot atual carrega definições completas de spells junto com cada
combatant. Isso é conveniente para fixtures, mas mistura catálogo de conteúdo
com estado derivado e aumenta o acoplamento do combate ao save futuro.

### Para que

Para permitir:

- conteúdo versionado e validado separadamente;
- snapshots de defesa menores no PVP;
- save sem cópias de definições imutáveis;
- servidor e cliente usando o mesmo catálogo por versão;
- migração de save sem migrar dados de conteúdo junto.

### Como

- Definir um `CombatContentContext` ou equivalente para fornecer definições
  por ID durante a resolução.
- Fazer o loadout persistir IDs/configuração, não definições inteiras.
- Fazer o snapshot carregar apenas o que o motor precisa para resolver uma
  batalha, ou IDs mais um contexto imutável claramente separado.
- Manter `CombatState` serializável somente se a decisão de persistir combate
  em andamento for tomada; caso contrário, documentá-lo como runtime efêmero.
- Definir a política para `seed`, versão de conteúdo e ordem de eventos.
- Não criar ainda `packages/content` completo; usar interfaces e fixtures
  compatíveis com a futura camada de conteúdo.

### Critérios de aceite

- Nenhum save precisa incluir definições completas de spells/inimigos.
- O motor recebe conteúdo por uma dependência explícita e imutável.
- O runtime não contém progressão, inventário, economia ou referências de UI.
- Um snapshot de combate pode ser usado no cliente e no servidor com a mesma
  versão de conteúdo.
- O log continua reproduzível com seed, snapshot e conteúdo iguais.

### Arquivos prováveis

- `packages/core/src/combat/types.ts`
- `packages/core/src/combat/engine.ts`
- `packages/core/src/combat/character-adapter.ts`
- `packages/core/src/spells.ts`
- `packages/core/src/spell-loadout.ts`
- futuro módulo de content contracts, se necessário.

---

## TODO 4 — Fechar as regras de combate que ainda estão provisórias

### O que fazer

Resolver e implementar, com testes, as diferenças entre a documentação e o
motor atual:

- `Alcance` e múltiplos alvos;
- regeneração de mana e `manaStealPercent`;
- papel de Vigor na mitigação, se confirmado pelo design;
- fórmula de proteção baseada na potência da spell ou regra global explícita;
- controle, acumulação/substituição e expiração de efeitos;
- dano de spell versus defesa, penetração e tipos de dano;
- cadência e ordem de ações dentro do tick;
- ataques simultâneos ou ordem determinística por lado;
- valores grandes e limites numéricos de combate.

### Por que

O documento de design descreve Mana como reserva e regeneração, define
`ManaSteal`, `Alcance` e proteção escalada por spell, mas o motor atual ainda
usa apenas uma parte dessas regras. Se o game loop for construído agora, ele
acabará codificando decisões provisórias difíceis de remover.

### Para que

Para que `GameLoop` apenas avance tempo e aplique transições, sem precisar
interpretar fórmulas ou completar efeitos de combate por fora do core.

### Como

- Criar uma tabela explícita de “documento → contrato → implementação → teste”.
- Para cada divergência, decidir se o código muda ou se a documentação muda;
  nunca resolver silenciosamente.
- Colocar números de balanceamento em regras/content context, não em branches
  por ID dentro do motor.
- Criar testes determinísticos por regra, além do smoke test geral.
- Testar vitória, derrota, party parcial, mana insuficiente, mana regenerada,
  múltiplos alvos, proteção, controle, crítico, sustento e expiração.
- Registrar decisões resolvidas na documentação e mover perguntas realmente
  abertas para a seção correspondente.

### Critérios de aceite

- Cada derivado documentado tem consumidor definido ou é explicitamente
  marcado como fora do combate atual.
- Mana tem fonte, consumo, recuperação e limites definidos.
- Alcance e alvo(s) têm contrato testável.
- Efeitos possuem regra de duração, substituição/stack e interação com dano.
- A ordem de eventos é determinística e documentada.
- Não há constante de balanceamento escondida no motor sem justificativa.

### Arquivos prováveis

- `packages/core/src/combat/damage.ts`
- `packages/core/src/combat/engine.ts`
- novo módulo de efeitos/regras;
- `packages/core/src/spell-runtime.ts`
- `packages/core/src/progression/derived.ts`
- `docs/design/core-design.md`
- testes do core, quando a infraestrutura de testes for adicionada.

---

## TODO 5 — Atualizar e sincronizar toda a documentação

### O que fazer

Revisar todos os documentos afetados depois que os quatro blocos anteriores
estiverem implementados.

Atualizar no mínimo:

- `docs/design/core-design.md`;
- `plano-tecnico-idle-ios.md`;
- `docs/done/combat-core.md`;
- `docs/done/combat-spells-effects.md`;
- `docs/done/combat-party-integration.md`;
- `AGENTS.md`, caso novos comandos/convenções sejam criados;
- descrição do PR de implementação.

### Por que

Já existem descrições antigas dizendo que o adaptador não existe, que o
snapshot não alimenta combate e que o Lab não aplica efeitos. Manter esses
trechos cria contexto contraditório e aumenta o custo de retomada por outra
pessoa ou agente.

### Para que

Para que a documentação se torne uma especificação operacional do próximo
game loop, e não apenas um registro histórico de intenções.

### Como

- Procurar cada ocorrência de `ainda não`, `futuro`, `não implementa`,
  `fora de escopo`, `resolveCombat`, `GameState`, `mana`, `alcance`, `loot` e
  `recuo`.
- Atualizar fórmulas, assinaturas, ownership e decisões resolvidas.
- Mover decisões tomadas para tabelas de decisões resolvidas.
- Manter em aberto apenas decisões que realmente não serão inferidas pelo
  código.
- Registrar no documento done o que foi entregue e o que permaneceu fora.

### Critérios de aceite

- Não há documento dizendo que uma integração já entregue ainda é futura.
- A documentação explica quais dados são persistentes, derivados e runtime.
- O contrato do combate coincide com a assinatura real do core.
- As limitações restantes estão explícitas e têm próximo passo definido.

---

## Testes e verificação da etapa inteira

Executar, no mínimo:

```bash
pnpm build:core
pnpm typecheck
pnpm build:web
git diff --check
```

Adicionar smoke tests ou testes automatizados para:

- composição de personagem e referências de loadout;
- party de 1, 2 e 4 membros;
- alteração de atributo/equipamento/Ossuary refletida no snapshot;
- spells e mana por personagem;
- múltiplos inimigos e seleção de alvo;
- vitória, derrota e membro derrotado sem encerrar a party inteira;
- determinismo completo;
- serialização do estado persistente sem runtime de combate;
- rejeição de estado inválido ou referência inexistente.

Antes de qualquer commit, revisar o staged diff e executar a varredura de
segredos definida no `AGENTS.md`.

## Fora de escopo desta etapa

- Implementar `GameLoop` ou `tickGameState`.
- Caminhada, animação, spawn de waves e recuo.
- Loot e recompensas aplicados após vitória.
- Persistência real no servidor, autenticação e sincronização.
- Bestiário definitivo ou contratos completos de conteúdo.
- Balanceamento final de números.

## Saída esperada

Ao terminar esta etapa, o próximo PR poderá implementar o `GameState` e o
game loop com segurança: o loop terá uma composição de roster clara, um
combat engine que recebe party/wave derivados, conteúdo separado, regras de
combate documentadas e um limite explícito entre estado persistente e runtime.
