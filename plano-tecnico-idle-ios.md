# Plano técnico — jogo idle para iOS

**Versão:** 0.2
**Status:** rascunho, pré-produção
**Escopo:** stack, arquitetura, sincronização, PVP, conteúdo, monetização
**Não cobre:** temática, design do loop, balanceamento numérico

---

## 1. Restrições que definem tudo

| # | Restrição | Consequência |
|---|---|---|
| R1 | Precisa estar na App Store | Elimina soluções que só existem em browser |
| R2 | Desenvolvimento via Claude Code | Elimina engines editor-cêntricas |
| R3 | Vai ser monetizado | Exige IAP, backend e instrumentação |
| R4 | Conta com sync entre dispositivos | O save deixa de ser local; servidor é obrigatório |
| R5 | Sem prestige, com arena PVP | O cliente deixa de ser confiável; validação server-side é obrigatória |
| R6 | Web é produto, e depois engine/editor | Conteúdo tem que ser dado, não código |
| R7 | Android no v2 | Arquitetura preparada, implementação adiada |

**R5 é a restrição mais cara do projeto.** Um idle single-player pode confiar no cliente. Um idle com PVP e sem reset, não — o poder acumula para sempre e vira moeda competitiva permanente. Isso reclassifica o projeto: de "app com um backend pequeno" para "jogo online com cliente burro-o-suficiente".

---

## 2. Stack

### Cliente
**TypeScript + React Native + Expo** — um único codebase que alvo iOS, Android e Web (RN Web via Expo).
A web roda no mesmo código React Native, sem projeto Vite separado.

### Servidor
**Node + TypeScript.** Não é preferência estética — é o que permite rodar *o mesmo pacote `core`* no servidor e no cliente. Com PVP e validação, essa paridade deixa de ser conveniência e vira requisito de corretude.

- **Banco:** Postgres. Saves em `jsonb`, contas e ranking em tabelas normais.
- **Auth:** Sign in with Apple + e-mail/senha. Se houver qualquer login social de terceiros, a Apple exige oferecer também uma opção equivalente de preservação de privacidade — Sign in with Apple resolve.
- **Hospedagem:** qualquer PaaS (Fly, Railway, Render). Não vale montar infra própria antes de ter jogadores.

### Por que não Unity / Godot / Capacitor

Mantido da v0.1: Unity e Godot têm estado de projeto preso ao editor, o que não combina com Claude Code, e são pesados para um jogo 90% UI. Capacitor carrega risco residual da Guideline 4.2. Com R4–R6, a vantagem do TypeScript unificado (cliente + servidor + editor) fica ainda maior.

---

## 3. Arquitetura: núcleo compartilhado entre cliente e servidor

```
                    ┌────────────────────────────────┐
                    │   packages/core (TS puro)      │
                    │   tick · economia · combate    │
                    │   save · migrations            │
                    └──┬──────────┬──────────────┬───┘
                       │          │              │
          ┌────────────┘          │              └───────────┐
          ▼                       ▼                          ▼
   ┌──────────────────────┐                           ┌────────────────┐
   │  apps/expo           │                           │  server        │
   │  React Native + Web  │                           │  Node + TS     │
   │  jogo + PhoneFrame   │                           │  validação·PVP │
   └──────────┬───────────┘                           └───────┬────────┘
              └──────────────────┬───────────────────────────┘
                                 ▼
              cliente simula                                │
              e propõe estado  ──────────────────────────────┘
                                    servidor revalida
                                    com o MESMO core
```

### A regra continua a mesma, e ficou mais importante

`packages/core` não importa nada de React, React Native, DOM, `window`, `document`, `fs` ou qualquer API de plataforma. Funções puras:

```ts
tick(state: GameState, deltaMs: number): GameState
applyAction(state: GameState, action: Action): GameState
resolveCombat(a: Combatant, b: Combatant, seed: number): CombatResult
serialize(state: GameState): SaveBlob
deserialize(blob: SaveBlob): GameState
```

`resolveCombat` precisa ser **determinístico e semeado**. Mesmo seed + mesmas entradas = mesmo resultado, no cliente e no servidor. É isso que permite mostrar a batalha animada no cliente enquanto o servidor já sabe o resultado — sem divergência.

O estado persistente separa `Party`, que contém apenas IDs ordenados, de um
`RosterState`, que localiza personagens, loadouts de equipamento e loadouts de
spells. O combate recebe builds resolvidos e um `CombatContentContext`
imutável; snapshots não duplicam definições de conteúdo e o runtime não
carrega progressão, inventário, economia ou referências de UI.

**Isso implica:** nada de `Math.random()` dentro do core. Um PRNG semeado (xorshift, mulberry32) explícito, passado como parâmetro. Um `Math.random()` esquecido no combate é o tipo de bug que só aparece em produção, de forma intermitente, e leva dias para achar.

### 3.1 ViewModel obrigatório no cliente Expo

As telas do cliente seguem **MVVM**. O `ViewModel` concentra estado local da
interface, valores derivados para exibição e comandos nomeados; a `View` fica
responsável por renderização e binding. A View não duplica regra de negócio e
não chama o core diretamente. O ViewModel pode adaptar o `packages/core`, que
continua sendo Functional Core puro e compartilhado com o servidor.

Essa separação também vale para laboratórios e telas temporárias. Um teste pode
simular uma entrada, mas deve fazê-lo por um comando do ViewModel e deixar
explícito que a simulação não é regra do jogo.

---

## 4. Estrutura do repositório

```
/
├── packages/
│   ├── core/                 # simulação pura — cliente e servidor
│   │   ├── src/
│   │   │   ├── state.ts
│   │   │   ├── tick.ts
│   │   │   ├── actions.ts
│   │   │   ├── economy.ts
│   │   │   ├── combat.ts     # determinístico, semeado
│   │   │   ├── rng.ts        # PRNG explícito
│   │   │   ├── validate.ts   # plausibilidade de save
│   │   │   └── save/         # serialização + migrations
│   │   └── test/
│   │
│   ├── content/              # DADOS, não código
│   │   ├── schema/           # zod: define o formato de tudo
│   │   ├── data/             # os arquivos de conteúdo em si
│   │   └── validate.ts       # CI falha se o conteúdo violar o schema
│   │
│   └── ui/                   # componentes compartilháveis (opcional)
│
├── apps/
│   ├── expo/                 # Expo — iOS, Android e Web (RN Web)
│   └── editor/               # map maker / engine (fase tardia)
│
└── server/
    ├── auth/
    ├── sync/                 # saves
    ├── pvp/                  # matchmaking, resolução, ranking
    └── telemetry/
```

`packages/content` separado é o que torna R6 possível. Se conteúdo é dado validado por schema, o editor é só uma UI que produz esse dado — e não precisa saber nada sobre o motor.

---

## 5. Sincronização e integridade

### 5.1 Modelo: cliente simula, servidor revalida

Simulação totalmente autoritativa no servidor é o padrão-ouro e é caro demais para um dev solo. O meio-termo correto:

1. O cliente simula localmente e o jogo responde instantaneamente.
2. Periodicamente (e ao fechar/abrir), o cliente envia o estado + o tempo decorrido + as ações tomadas.
3. O servidor roda `validate.ts` do **mesmo core**: esse ganho é possível nesse intervalo, com esses upgrades?
4. Se sim, aceita e vira o save canônico. Se não, rejeita e devolve o último estado válido.

Isso pega a esmagadora maioria dos cheats (edição de memória, save hackeado, relógio adiantado) por uma fração do custo de simulação autoritativa. E o que não pega, importa pouco — desde que **o PVP use exclusivamente estado validado pelo servidor.**

### 5.2 Tempo é do servidor

Todo cálculo de progresso offline usa `lastSeenAt` vindo do servidor, nunca `Date.now()` do dispositivo.

- Cliente sem rede: simula localmente, mas o ganho fica *pendente* até sincronizar.
- Na sincronização, o servidor recalcula com o próprio relógio e o valor dele prevalece.
- `now < lastSeenAt` → delta rejeitado, sem exceção.

### 5.3 Progresso offline com teto

Decisão travada: existe, com freio de tempo.

- Rende até um teto de N horas; além disso, para de acumular.
- O teto é um número de balanceamento, não uma constante escondida no código — vive em `packages/content`.
- Anúncio recompensado pode dobrar o rendimento acumulado (não estender o teto — estender o teto complica a fórmula e o balanceamento).

Com teto fixo, o cálculo é fechado e barato: `min(delta, teto) × taxa`. Sem loop de catch-up, sem travar no splash de quem sumiu três semanas.

### 5.4 Conflito entre dispositivos

Com R4, dois aparelhos podem jogar offline ao mesmo tempo. Regra simples e defensável:

- O save tem `seq` monotônico e `deviceId`.
- Na sincronização, o servidor aceita o `seq` maior que passe na validação.
- O dispositivo perdedor recebe o estado canônico e mostra um aviso claro.
- **Não tente merge.** Merge de estado de idle game gera duplicação de recursos e é vetor de exploit. Last-valid-write-wins, avisando o jogador, é honesto e seguro.

### 5.5 Números grandes

`break_infinity.js` desde o commit inicial. Nenhum valor de economia é `number` nativo — ele perde precisão acima de 2^53 e estoura em ~1e308, e sem prestige (R5) sua economia vai passar disso com folga.

**Consequência de R5:** sem reset, os números crescem monotonicamente para sempre. A curva precisa ser projetada para anos, não para um ciclo. É um problema de balanceamento maior do que parece — seção 6.

### 5.6 Migrations de save

`version: number` em todo save, cadeia de migrações `v(n) → v(n+1)`. Com contas no servidor, você ganha uma vantagem: pode migrar em lote, do lado do servidor, sem esperar o jogador abrir o app. Mas a migração precisa existir de qualquer forma.

O primeiro corte vertical implementa `SerializedSave` v1 no `packages/core`,
com validação antes de desserializar. O core oferece `MemorySaveStore`; o app
usa `ExpoSaveStore`, com `localStorage` no web e AsyncStorage no mobile. A
sincronização remota e o schema de banco permanecem planejados para a etapa de
contas; o ambiente dev atual persiste apenas localmente.

---

## 6. A consequência de não ter prestige

Sem reset, você perde o mecanismo que a maioria dos idles usa para (a) achatar a curva, (b) dar sensação de recomeço e (c) criar conteúdo infinito de graça. Precisa substituir os três.

| O que prestige dava | Substituto |
|---|---|
| Achatamento da curva | Expansão horizontal: novos sistemas, não números maiores |
| Sensação de recomeço | Temporadas de arena com ranking zerado (progresso não) |
| Conteúdo infinito | O PVP é o endgame infinito |
| Freio na inflação | Sumidouros permanentes de recurso |

**Sumidouros são obrigatórios aqui.** Sem reset e sem dreno, a moeda mole vira irrelevante em poucas semanas e o jogo perde toda a tensão econômica. Candidatos: upgrades de custo crescente sem teto, taxa de entrada na arena, reroll de atributos, cosméticos compráveis com moeda mole. Planeje os drenos junto com as fontes, nunca depois.

**Expansão horizontal é sua fonte de conteúdo.** Cada atualização adiciona um sistema novo (região, tipo de unidade, recurso), não só um multiplicador maior. Isso é mais caro de produzir que prestige — e é exatamente por isso que R6 (a engine/editor) faz sentido estratégico, não só como ambição.

---

## 7. Arena PVP

### 7.1 Formato recomendado: assíncrono

Combate síncrono em tempo real é a decisão errada aqui — exige jogadores online simultaneamente, o que colide frontalmente com o gênero idle, onde as sessões são curtas e espalhadas ao longo do dia.

**Formato:** você ataca um *snapshot* do outro jogador. O defensor não precisa estar online. O combate resolve no servidor com `resolveCombat(atacante, defensor, seed)` e o resultado é replicado no cliente para animação.

Isso dá: sem requisito de simultaneidade, sem netcode, sem lag, determinístico, validável.

### 7.2 Matchmaking

Rating tipo ELO/Glicko sobre **poder efetivo**, não sobre tempo de conta.

Isso resolve elegantemente a tensão de monetização (seção 8): quem paga sobe de liga mais rápido e, portanto, encontra oponentes mais fortes mais cedo. Dinheiro compra *progressão na escada*, não *vitórias na escada*.

### 7.3 Temporadas

Ranking zera a cada temporada; progresso do jogador nunca. Isso dá o "recomeço" que o prestige daria, sem tocar no que o jogador construiu, e cria um ciclo natural de recompensa e reengajamento.

### 7.4 O que o PVP exige que o single-player não exigia

- Snapshot de combate no servidor, atualizado a cada sincronização
- Só estado *validado* entra no snapshot
- Log de combate persistido (para o defensor ver que foi atacado, e para você auditar)
- Proteção contra farm: cooldown de ataque ao mesmo alvo, escudo após derrota
- Balanceamento competitivo, que é uma disciplina diferente de balanceamento de progressão

### 7.5 Risco a assumir conscientemente

Sem prestige, a diferença de poder entre um jogador de 1 dia e um de 1 ano cresce sem teto. Ligas e matchmaking por poder contêm o problema, mas não o eliminam. Se em algum momento a base da tabela parecer morta, a solução é **normalização de stats dentro da arena** (o combate usa valores comprimidos, não os absolutos).

Vale modelar o combate desde já de forma que isso possa ser ligado depois sem reescrever nada: `resolveCombat` recebe `Combatant`, não `GameState`. A função que converte um em outro é o ponto onde a normalização entraria.

---

## 8. Monetização

### 8.1 Fontes

| Fonte | Peso | Nota |
|---|---|---|
| Anúncios recompensados | Alta | O motor real de receita em idle. Sempre opt-in. |
| Moeda premium (consumível) | Média | Aceleração, slots, conveniência |
| Remoção de anúncios | Média | Compra única, alta conversão, ótimo goodwill |
| Cosméticos | Média→Alta | **Cresce muito de valor com PVP** — seu perfil é visto por outros |
| Passe de temporada | Alta, no futuro | Casa perfeitamente com as temporadas de arena (7.3) |

Cosméticos e passe de temporada eram marginais no plano anterior. Com PVP e temporadas, viram pilares — e são as fontes mais limpas que existem, porque não tocam em poder.

### 8.2 A tensão que o PVP cria, e como resolver

A regra do RookForge — **dinheiro compra conveniência, nunca poder** — fica difícil de sustentar quando existe PVP. Se dinheiro acelera progresso, e progresso é poder, e poder decide a arena, então dinheiro decide a arena. Isso é pay-to-win com passos extras.

Três defesas, em ordem de preferência:

1. **Matchmaking por poder** (7.2). Quem paga encontra quem é forte. Dinheiro compra tempo, não vitórias. Defesa principal e mais elegante.
2. **Recompensas por liga, não absolutas.** Quem está no topo não drena o resto do jogo.
3. **Normalização de stats na arena** (7.5). O martelo, se as duas primeiras não bastarem.

**O que não fazer, nunca:** vender qualquer item que só exista na loja e afete combate. É a linha que, uma vez cruzada, não volta.

### 8.3 Taxas e canais

Estas regras mudaram duas vezes em dois anos. Reverificar nas App Store Review Guidelines antes de implementar.

- **Baseline:** 30% de comissão; 15% pelo Small Business Program (faturamento < US$ 1M/ano). Inscrição anual e explícita — fazer antes do lançamento.
- **Brasil:** após o acordo com o CADE (homologado em dez/2025, implementado em jun/2026), a Apple passou a permitir lojas alternativas e meios de pagamento alternativos na App Store brasileira, com estrutura de comissão reestruturada. Relatos indicam até 21% de comissão mais 5% de taxa de processamento no IAP, com condições diferentes para pagamento externo.
- **EUA:** após Epic v. Apple (abr/2025), links de compra externa são permitidos na loja americana. As fontes divergem sobre a comissão aplicável — algumas indicam 0%, outras uma taxa dentro de janela de atribuição.

**Recomendação:** lançar com IAP puro via **RevenueCat** (abstrai iOS/Android — útil direto no v2 —, gerencia recibos, entitlements e restauração). Pagamento externo é otimização pós-lançamento, nunca arquitetura inicial.

**Vantagem de R4:** com contas e servidor, o entitlement mora no servidor, não no dispositivo. Compra feita no iOS aparece na web e no Android automaticamente. Isso é mais robusto e abre a porta para venda pela web depois, sem retrabalho.

### 8.4 Instrumentação mínima

Retenção D1/D7/D30 · sessões por dia · ponto de abandono na progressão · exibição e conclusão de rewarded · conversão para primeira compra e tempo até ela · ARPDAU · **participação e retenção na arena**.

A última é métrica nova e crítica: se o PVP não retém, ele não justifica o custo que impõe a toda a arquitetura.

---

## 9. Conteúdo e a engine (R6)

O editor é ambição de fase tardia, mas impõe uma decisão **agora**: conteúdo é dado validado por schema, nunca código.

```
packages/content/schema/   → zod schemas
packages/content/data/     → arquivos de conteúdo
packages/content/validate  → roda no CI
```

**Regras:**
- O core lê conteúdo, nunca o embute.
- CI falha se qualquer arquivo de conteúdo violar o schema.
- Conteúdo é versionado junto com o save — um save antigo precisa saber com qual versão de conteúdo foi feito.

Assim `apps/editor` vira só uma UI que produz e valida esses arquivos. Não precisa entender o motor.

**Se o editor for para as mãos dos jogadores** (UGC, mapas compartilhados), isso aciona a **Guideline 1.2 da Apple**: conteúdo gerado por usuário exige filtragem, mecanismo de denúncia, bloqueio de usuários abusivos e contato de suporte. É escopo relevante — deixe UGC compartilhável fora do v1 e trate o editor primeiro como ferramenta interna e de criadores selecionados.

---

## 10. Compliance App Store

- [ ] **Apple Developer Program** — US$ 99/ano, aprovação leva dias. Fazer já.
- [ ] **Guideline 3.1.1** — bens digitais via IAP (com as ressalvas de 8.3)
- [ ] **Guideline 4.2** — mitigado por React Native; ainda assim o valor precisa estar claro nos primeiros 60s do review
- [ ] **Guideline 4.8** — se houver login social de terceiros, oferecer também Sign in with Apple ou equivalente
- [ ] **Guideline 1.2** — só se houver UGC compartilhável (seção 9)
- [ ] **Restaurar compras** — obrigatório para não-consumíveis. Rejeição garantida se faltar.
- [ ] **Exclusão de conta dentro do app** — obrigatório desde que existam contas. **Novo com R4.**
- [ ] **LGPD / GDPR** — contas significam dados pessoais: base legal, exclusão, exportação, retenção. **Novo com R4.**
- [ ] **Privacy policy** — URL pública
- [ ] **App Privacy nutrition labels** — declarar tudo, incluindo o que a rede de anúncios coleta
- [ ] **ATT prompt** — se usar IDFA
- [ ] **Classificação etária** — anúncios, compras e PVP afetam
- [ ] **Notas para o review** — caminho de 3–6 passos e credenciais de teste

Os dois marcados como novos costumam ser descobertos tarde. Exclusão de conta *dentro do app* é rejeição certa se faltar.

---

## 11. Roadmap

| Fase | Entrega | Critério de saída |
|---|---|---|
| 0 | Monorepo, TS, testes, CI (preview no Firebase via GitHub Actions — `.github/workflows/firebase-preview.yml`), lint barrando imports de plataforma no core | `pnpm test` roda o núcleo |
| 1 | `core` completo sem UI: tick, economia, save, migrations, PRNG, combate determinístico | Simulação de 200h em <1s; combate reproduz com o mesmo seed |
| 2 | Schema de conteúdo + dados iniciais | CI valida o conteúdo |
| 3 | Web jogável (feia) sobre o core | Loop jogável, dá pra sentir e balancear |
| 4 | Balanceamento single-player + desenho dos sumidouros | Curva sem paredes e sem tédio; economia não colapsa em 1 ano simulado |
| 5 | Servidor: auth, sync, validação de save | Jogar na web, fechar, abrir no celular, estado bate |
| 6 | Camada Expo + EAS + TestFlight | **App instalado no seu iPhone** |
| 7 | IAP via RevenueCat + rewarded ads | Compra sandbox funcionando, entitlement no servidor |
| 8 | Arena PVP: snapshots, matchmaking, ranking, temporadas | Duas contas se enfrentam, resultado idêntico nos dois clientes |
| 9 | Notificações, polimento, ícone, screenshots, exclusão de conta | Checklist da seção 10 completo |
| 10 | Beta fechado no TestFlight | Retenção D1/D7 e participação na arena medidas |
| 11 | Submissão | — |
| v2 | Android | Reaproveita core, servidor e RevenueCat |
| v2+ | Editor / engine | Só depois do conteúdo estabilizar |

**A fase 6 continua sendo a mais adiada e a mais importante.** Faça o primeiro build EAS com o jogo ainda feio. Certificados, provisioning, ícones faltando, permissões mal declaradas — tudo aparece no primeiro build, e descobrir na semana do lançamento é o pior cenário.

**A fase 8 depende inteiramente da 1.** Se o combate não for determinístico e semeado, o PVP não funciona. Não avance sem isso resolvido.

---

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **Economia colapsa sem prestige** | **Alto** | Sumidouros desenhados junto com as fontes (seção 6); simular 1 ano de jogo nos testes |
| **PVP vira pay-to-win** | **Alto** | Matchmaking por poder; nada exclusivo de loja afeta combate (8.2) |
| **Arena morta na base da tabela** | Médio | Ligas; normalização de stats já modelada como opção (7.5) |
| Não-determinismo escondido no combate | Alto | `Math.random()` proibido no core via lint; teste de reprodutibilidade no CI |
| Escopo do servidor cresce sem controle | Alto | Validação, não simulação autoritativa (5.1) |
| Lógica do core vazar para a UI | Alto | Lint rule proibindo imports de plataforma em `packages/core` |
| Editor puxa o escopo cedo demais | Médio | Schema agora, editor só depois do conteúdo estabilizar |
| Custo de infra antes de ter receita | Médio | PaaS pequeno; nada de arquitetura para escala que não existe |
| Regras de pagamento da Apple mudam de novo | Médio | Não arquitetar sobre pagamento externo no v1 |

---

## 13. Perguntas em aberto

1. **A arena é o endgame ou um sistema paralelo?** Muda se o balanceamento single-player precisa de um teto suave.
2. **O combate é auto-battle ou tem input do jogador?** Auto-battle assíncrono é o padrão do gênero e é muito mais simples de validar. Input do jogador exige reproduzir a entrada, não só o resultado.
3. **O que o jogador leva da arena?** Se der recurso do jogo, o PVP entra na economia e afeta o balanceamento da seção 6. Se der só cosmético e ranking, os sistemas ficam desacoplados — mais seguro para começar.
4. **Temporadas de que duração?** Define o ritmo de conteúdo e do passe.
5. **Qual o teto do offline, e a que taxa?** Teto curto (2–4h) força sessões frequentes; teto longo (12–24h) é mais respeitoso e casa melhor com o gênero. Recomendo começar longo e apertar com dados, nunca o contrário.

A pergunta 3 é a mais urgente: decide se você tem um sistema ou dois, e é cara de mudar depois da fase 4.

---

## Changelog

- **v0.2** — Respondidas as perguntas em aberto da v0.1. Adicionados: servidor Node/TS com validação de save, sincronização multi-dispositivo, arena PVP assíncrona com temporadas, arquitetura de conteúdo orientada a schema para o editor futuro, offline com teto. Removido prestige e adicionada a seção 6 sobre suas consequências econômicas. Compliance ampliado (exclusão de conta, LGPD, Guidelines 1.2 e 4.8). Roadmap de 9 para 12 fases.
- **v0.1** — Documento inicial. Stack (TS + RN + Expo), núcleo compartilhado, monetização com IAP + rewarded ads.
