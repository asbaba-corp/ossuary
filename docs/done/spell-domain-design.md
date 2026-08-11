# Especificação do domínio de spells

## Escopo

Este documento fecha a mecânica fundamental de spells sem implementar combate,
loop idle, aquisição de conteúdo ou slots de equipamento. O contrato serve ao
combate ativo e ao cálculo fechado offline; a resolução concreta continuará
sendo responsabilidade do futuro domínio de combate. O core agora expõe a
avaliação pura da definição, gatilho, escala e tentativa de auto-cast para que
essas partes possam ser testadas antes do combate.

A configuração de loadout foi implementada posteriormente como domínio
separado em `spell-loadout.ts`; este documento continua descrevendo apenas a
definição e a mecânica de tentativa de auto-cast.

A orquestração de várias spells foi adicionada depois em `spell-runtime.ts`.
Ela mantém o estado runtime e retorna tentativas na prioridade do loadout,
parando no primeiro disparo, mas continua sem aplicar efeitos de combate.

## Modelo de conteúdo

Uma spell é uma definição imutável e data-driven. Não existe código especial
para uma spell individual: o conteúdo fornece os dados e o domínio interpreta
os tipos conhecidos.

```ts
type SpellArchetype = "damage" | "protection" | "control"

type SpellTrigger =
  | { kind: "cooldown" }
  | { kind: "hpBelow"; thresholdPercent: number }
  | { kind: "manaBelow"; thresholdPercent: number }
  | {
      kind: "enemyCount"
      min?: number
      max?: number
    }

type SpellScaling = {
  basePower: number
  intCoefficient: number
}

type SpellDefinition = {
  id: string
  name: string
  archetype: SpellArchetype
  manaCost: number
  cooldown: number
  trigger: SpellTrigger
  effect: DamageEffect | ProtectionEffect | ControlEffect
  scaling: SpellScaling
}
```

`cooldown` é uma duração na unidade de tempo adotada pelo simulador. Conteúdo
inválido — custo negativo, cooldown negativo, limiar fora de `0..100`, ou
gatilho `enemyCount` sem mínimo nem máximo — deve ser rejeitado na validação de
conteúdo, antes da simulação. Quando ambos existem, `min` não pode ser maior
que `max`.

O payload é discriminado pelo arquétipo:

```ts
type DamageEffect = {
  kind: "damage"
  damageType: string
  target: string
}

type ProtectionEffect = {
  kind: "protection"
  protectionType: string
  duration: number
}

type ControlEffect = {
  kind: "control"
  controlType: string
  duration: number
  chancePercent: number
}
```

Os campos de alvo, tipo de dano/proteção/controle e os números de
balanceamento são conteúdo. O contrato não cria uma classe nova por spell.

### Arquétipos iniciais

- **Dano:** aplica dano ao alvo ou conjunto de alvos definido no payload. A
  potência é `basePower + INT × intCoefficient`, com o multiplicador de
  `1 + spellDamagePercent` vindo do equipamento.
- **Proteção:** cria escudo ou mitigação conforme `protectionType`, durante a
  duração declarada. A potência usa a mesma base de INT e o mesmo bônus de
  dano de spell, salvo uma decisão futura de balanceamento do conteúdo.
- **Controle:** tenta aplicar o controle declarado durante sua duração. A
  chance é resolvida pelo PRNG da simulação; falhar na chance não devolve mana
  nem desfaz o disparo.

O arquétipo não determina sozinho alvo, duração ou força: esses dados devem
estar no payload e nos coeficientes. Assim, adicionar conteúdo não exige uma
nova ramificação de código.

## Separação das camadas

| Camada | Responsabilidade | O que não contém |
|---|---|---|
| Definição da spell | identidade, arquétipo, custo, cooldown, gatilho, efeito e escala | estado do personagem ou decisão de UI |
| Configuração do auto-cast | ativação e ordem/prioridade de tentativa para uma spell disponível | alteração do custo, efeito ou fórmula |
| Estado runtime | mana atual, cooldown restante, efeitos temporários e contadores da execução | dados de aquisição ou definição mutável |
| Resolução futura do combate | avaliar o contexto, consumir mana, reiniciar cooldown e aplicar eventos | renderização e regras duplicadas no cliente |

A especificação não decide quantas spells um personagem pode equipar, nem cria
slots. Uma configuração só pode referenciar conteúdo que a camada de aquisição
e equipagem tenha tornado disponível; como essa camada ainda não existe, sua
fonte permanece deliberadamente fora deste documento.

## Gatilhos e regras de disparo

Cada definição usa exatamente um tipo de gatilho:

| Tipo | Satisfeito quando |
|---|---|
| `cooldown` | a spell está pronta; é uma tentativa periódica |
| `hpBelow` | HP percentual atual é menor ou igual ao limiar |
| `manaBelow` | mana percentual atual é menor ou igual ao limiar |
| `enemyCount` | a quantidade de inimigos no contexto atende ao mínimo e ao máximo declarados |

O gatilho não substitui as pré-condições comuns. A spell só dispara quando,
na ordem, a configuração está habilitada, o gatilho está satisfeito, o
cooldown restante é zero e a mana atual é pelo menos `manaCost`.

Quando dispara, a resolução deve consumir exatamente o custo, reiniciar o
cooldown e emitir o evento de tentativa que o combate aplicará. Uma avaliação
que falha não consome mana e não reinicia cooldown.

Portanto, a spell não dispara nestes casos:

- auto-cast desligado ou spell inativa (`disabled`);
- HP, mana ou quantidade de inimigos não atende ao gatilho
  (`trigger_not_met`);
- cooldown ainda positivo (`cooldown_remaining`);
- mana atual menor que o custo (`insufficient_mana`);
- definição inválida, que deve ser recusada antes da execução;
- controle cuja rolagem de chance falha: houve disparo e custo, mas o efeito
  não foi aplicado (`effect_failed_chance`), não uma falha de gatilho.

Se várias spells estiverem prontas no mesmo instante, a prioridade da
configuração define a ordem de tentativa. Não há regra implícita de equipagem
ou limite de simultaneidade neste documento.

## Mana, cooldown e escala

Mana é derivada principalmente de INT. `manaStealPercent`, afixo de
equipamento, recupera mana a partir do dano efetivo conforme a fórmula geral
do combate; `spellDamagePercent` aumenta a potência da spell. Esses afixos não
mudam o custo nem o cooldown.

O cálculo de potência é parametrizado pelo conteúdo:

```text
potência = basePower + INT × intCoefficient
potência final = potência × (1 + spellDamagePercent)
```

Os números, curvas de derivados e eventuais limites vivem em dados de
balanceamento. O contrato não escolhe se uma futura expansão usará tier ou
nível para alterar a escala; essa é uma das partes de aquisição/progressão que
continua aberta.

Mana insuficiente é um bloqueio automático, não um custo parcial: não existe
mana negativa, dívida de mana ou consumo arredondado para baixo. A
implementação futura deverá definir a unidade e a precisão do tempo de
cooldown junto ao simulador, mantendo a mesma regra para ativo e offline.

## Determinismo e offline

Chance de controle e qualquer chance futura de efeito recebem o mesmo PRNG
semeado usado pela resolução do combate. Seed, estado inicial, definições e
contexto iguais devem produzir a mesma sequência de tentativas, eventos,
consumos e estado final.

O cálculo offline é uma execução fechada do mesmo contrato, não um bônus médio
separado. Ele deve registrar os mesmos motivos de não disparo e resolver as
mesmas oportunidades temporais que o combate ativo. A camada visual não pode
criar, ocultar ou alterar efeitos.

## Casos-limite

- **Cooldown zero:** a spell pode ser tentada em toda oportunidade de
  avaliação em que o gatilho e a mana permitirem; não deve gerar um loop
  infinito dentro de uma única oportunidade.
- **Custo zero:** a spell pode disparar sem consumo de mana, mas ainda respeita
  gatilho e cooldown.
- **Mana exatamente igual ao custo:** dispara; a comparação é `>=`.
- **HP ou mana exatamente no limiar:** o gatilho `Below` dispara; a comparação
  é `<=`.
- **Nenhum inimigo:** só passa em `enemyCount` quando os limites declarados
  permitirem zero.
- **Alvo inválido ou ausente:** a tentativa deve produzir evento de falha
  validável pelo combate, sem aplicar dano/controle a um alvo inexistente;
  custo e cooldown seguem a política de disparo, não são revertidos por uma
  falha de aplicação.
- **Controle sem sucesso:** consome e entra em cooldown, mas registra a falha
  de chance para que ativo e offline permaneçam reproduzíveis.
- **Contexto com várias spells:** prioridade total e estável; empates precisam
  de uma ordenação determinística, como `spellId`.

## Telemetria esperada

Cada avaliação deve permitir observar, sem dados pessoais, `spellId`, instante
ou tick, arquétipo, gatilho, prioridade, mana antes/depois, cooldown antes e
depois, resultado e razão. Resultados mínimos:

```text
disabled
trigger_not_met
cooldown_remaining
insufficient_mana
fired
effect_applied
effect_failed_chance
effect_failed_target
```

O objetivo principal é explicar gargalos de build — especialmente
`insufficient_mana` — sem fazer o cliente decidir se o efeito é válido. O
servidor/simulador deve ser a fonte dos eventos aceitos; telemetria é
diagnóstico, não estado confiável do jogador.

## Laboratório test-only

`apps/expo` tem uma seção “Spells (teste isolado)” no laboratório de mecânicas.
Ela usa fixtures data-driven dos três arquétipos e permite:

- selecionar a spell;
- ajustar HP, mana e quantidade de inimigos do contexto;
- avançar o cooldown em um segundo;
- tentar o auto-cast e ver a razão, mana, cooldown e potência resultantes;
- repetir o controle com a seed fixa `spell-lab-seed` para observar o mesmo
  resultado determinístico.

O painel não aplica dano, escudo ou controle a alvos. Isso continua reservado
ao futuro `resolveCombat`.

## Decisões ainda abertas

Q14 está parcialmente resolvida: a mecânica de spell está fechada, mas ainda
não foram decididos a fonte de aquisição, raridade, tier, escala por nível ou
tier de conteúdo, slots e quantidade máxima de spells equipáveis. Também não
foram implementados `resolveCombat`, combate, loop idle ou aquisição. Nenhuma
dessas decisões deve ser inferida a partir deste contrato.

## Verificação do escopo

- Nenhuma implementação de combate ou de simulação offline foi adicionada.
- O core ganhou apenas avaliação pura da mecânica de spells, sem dependência de
  React.
- O laboratório ganhou a seção test-only de auto-cast descrita acima.
- O loop do laboratório permanece inalterado.
- A seção 4.6 de `docs/design/core-design.md` resume e referencia este
  contrato, mantendo a aquisição e a equipagem explicitamente em aberto.
