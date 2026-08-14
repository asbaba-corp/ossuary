import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type DimensionValue } from "react-native";
import { useGameViewModel, type GamePanel, type SceneAnimationState } from "./GameViewModel";
import { SceneRenderer } from "./SceneRenderer";
import { Sprite } from "./Sprite";
import { WORLD_0_CONTENT } from "@ossuary/core";

const attributeLabels = [
  ["cons", "Constituição"], ["str", "Força"], ["dex", "Destreza"], ["int", "Inteligência"],
] as const;

export function GameScreen() {
  const vm = useGameViewModel();
  const character = vm.state?.roster.characters[0];
  const combatants = vm.state?.run?.combat?.combatants ?? [];
  const enemies = combatants.filter(({ snapshot }) => snapshot.side === "enemy");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View><Text style={styles.title}>OSSUARY</Text><Text style={styles.subtitle}>{vm.phaseLabel}</Text></View>
        <Text style={styles.status}>{vm.state?.run?.status === "combat" ? "COMBATE" : "ANDANDO"}</Text>
      </View>

      <View style={styles.hud}>
        <Metric label="NIGHT" value={vm.phaseLabel} icon={<Lua />} />
        <Metric label="WAVE" value={vm.waveLabel} icon={<Ondas />} />
        <Metric label="GOLD" value={String(vm.gold)} icon={<Moedas />} />
        <View style={styles.hudIcons}>
          <HudButton label="▣ Mochila" onPress={() => vm.openPanel("inventory")} />
          <HudButton label="♙ Atributos" onPress={() => vm.openPanel("stats")} />
          <HudButton label="▤ Bestiário" onPress={() => vm.openPanel("bestiary")} />
        </View>
        <Text style={styles.event}>{vm.eventMessage}</Text>
      </View>

      <SceneRenderer
        time={vm.sceneTime}
        animations={vm.combatAnimations}
        hits={vm.combatHits}
        feedback={vm.combatFeedback}
        partyId={vm.partyCombatants[0]?.id}
        status={vm.state?.run?.status ?? "walking"}
        marcha={vm.marchProgress}
        camera={vm.camera}
        enemies={enemies.length > 0
          ? enemies.map(({ snapshot, hp }) => ({ id: snapshot.id, name: snapshot.name, hp, maxHp: snapshot.stats.maxHp }))
          : vm.upcomingEnemies}
      />

      <View style={styles.partyBar}>
        <View style={styles.partyHeader}><Text style={styles.sectionTitle}>PARTY</Text><Text style={styles.muted}>{vm.state?.party.characterIds.length ?? 1} / 4 ocupados</Text></View>
        <View style={styles.partyGrid}>
          {vm.partyCombatants.length > 0 ? vm.partyCombatants.map((combatant) => <CharacterCard key={combatant.id} character={character} combatant={combatant} />) : <CharacterCard character={character} />}
          {Array.from({ length: Math.max(0, 4 - Math.max(1, vm.partyCombatants.length)) }, (_, index) => { const slot = String(Math.max(1, vm.partyCombatants.length) + index + 1); return <View key={slot} style={styles.locked}><Text style={styles.lockedTitle}>SLOT {slot}</Text><Text style={styles.muted}>{["2 500", "18 000", "120 000"][Number(slot) - 2] ?? "120 000"} ouro</Text></View>; })}
        </View>
        <Text style={styles.hint}>A party chega a quatro. Slots e personagens são comprados com ouro — preços ilustrativos, compra ainda não implementada.</Text>
      </View>

      <View style={styles.analyzerHeader}><Text style={styles.sectionTitle}>SESSION ANALYZER</Text></View>
      <View style={styles.ledger}>
        <Metric label="SESSION TIME" value={mmss(vm.sceneTime)} />
        <Metric label="BALANCE" value={String(vm.runIncome - vm.runExpenses)} tone={vm.runIncome - vm.runExpenses >= 0 ? "pos" : "neg"} />
        <Metric label="WASTE" value={String(vm.runExpenses)} tone="neg" />
        <Metric label="LOOT" value={`+${vm.state?.run?.metrics?.loot ?? vm.runIncome}`} tone="pos" />
        <Metric label="POTIONS AVAILABLE" value={String(Math.floor(vm.gold / 50))} />
        <Metric label="POEIRA" value={String(vm.runDust)} />
        <Metric label="DAMNATIONS" value={String(vm.runRetreats)} />
      </View>

      <View style={styles.controls}>
        <GameButton label={vm.paused ? "Continuar" : "Pausar"} onPress={vm.togglePause} />
        <GameButton label={`Velocidade ${vm.speed}×`} onPress={vm.toggleSpeed} />
        <GameButton label="Reiniciar" onPress={vm.reset} />
      </View>

      {vm.panel && <Panel panel={vm.panel} state={vm.state} inventoryPage={vm.inventoryPage} onInventoryPage={vm.setInventoryPage} onClose={vm.closePanel} />}
    </ScrollView>
  );
}

function animationDuration(animation: "attack" | "hurt" | "dead") { return animation === "dead" ? Number.POSITIVE_INFINITY : animation === "attack" ? 0.5 : 0.3; }

function Scene({ time, attackTime, status, enemies, feedback, animations, partyId }: { time: number; attackTime: number; status: string; enemies: readonly { id: string; name: string; hp: number; maxHp: number }[]; feedback: readonly { id: string; text: string; color: string }[]; animations: SceneAnimationState; partyId?: string }) {
  const displayEnemies = enemies.length > 0 ? enemies : Array.from({ length: status === "walking" ? 3 : 0 }, (_, index) => ({ id: `ghost-${index}`, name: "Ignavo", hp: 1, maxHp: 1, ghost: true, index }));
  const moving = status === "walking" || status === "retreating";
  const heroSignal = partyId ? animations[partyId] : undefined;
  const heroSignalled = heroSignal && (heroSignal.animation === "dead" || time - heroSignal.epoch < animationDuration(heroSignal.animation));
  const heroAnimation = heroSignalled ? heroSignal.animation : moving ? "walk" : "idle";
  const heroTime = heroSignalled && heroSignal ? Math.max(0, time - heroSignal.epoch) : moving ? time : attackTime;
  return <View style={styles.scene} accessibilityLabel="Cena do Vestíbulo">
    <View style={styles.ceiling}><Text style={styles.ceilingTexture}>▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦</Text><Text style={styles.ceilingTexture}>▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦ ▦</Text></View>
    <View style={styles.skyGlow} />
    <View style={styles.wall}>
      {Array.from({ length: 18 }, (_, index) => <Text key={index} style={[styles.skull, { left: `${(index % 6) * 18 + 2}%`, top: `${Math.floor(index / 6) * 29 + 12}%` }]}>☠</Text>)}
    </View>
    {["18%", "75%"].map((left) => <View key={left} style={[styles.column, { left: left as DimensionValue }]}><View style={styles.capital} /><View style={styles.torch}><Text style={styles.flame}>♦</Text></View></View>)}
    <View style={[styles.sceneParty, { left: moving ? `${25 + Math.sin(time * 2) * 2}%` : "28%" }]}><Sprite kind="hero" animation={heroAnimation} time={heroTime} scale={1.3} label="Sem-Nome" /><Text style={styles.heroName}>SEM-NOME</Text></View>
    <View style={styles.enemies}>{displayEnemies.map((enemy, index) => { const signal = animations[enemy.id]; const signalled = signal && (signal.animation === "dead" || time - signal.epoch < animationDuration(signal.animation)); const animation = signalled ? signal.animation : moving ? "walk" : "idle"; const animationTime = signalled && signal ? Math.max(0, time - signal.epoch) : time + index * 0.13; return <View key={`${enemy.id}-${index}`} style={[styles.enemy, { left: `${Math.min(82, 53 + index * 9 - (moving ? Math.min(10, time * 3) : 0))}%` as DimensionValue }]}>{enemy.name === "Ignavo" ? <View style={[!("ghost" in enemy) && styles.enemySprite, "ghost" in enemy && styles.ghostEnemy]}><Sprite kind="ignavo" animation={animation} time={animationTime} scale={1.05} flip label={enemy.name} /></View> : <Text style={styles.enemyGlyph}>☠</Text>}<Text style={styles.enemyName}>{enemy.name}</Text>{!("ghost" in enemy) && <Bar value={enemy.hp} max={enemy.maxHp} />}</View>; })}</View>
    <View pointerEvents="none" style={styles.feedback}>{feedback.map((item, index) => <Text key={item.id} style={[styles.feedbackText, { color: item.color, left: `${45 + (index % 4) * 12}%`, top: 118 - (index % 3) * 18 }]}>{item.text}</Text>)}</View>
    <View style={styles.floor} />
    <Text style={styles.sceneHint}>{status === "combat" ? "A party parou. O combate resolve sozinho." : status === "retreating" ? "Recuando para uma margem mais rasa." : "A marcha continua…"}</Text>
  </View>;
}

function CharacterCard({ character, combatant }: { character: ReturnType<typeof import("@ossuary/core").createCharacter> | undefined; combatant?: { readonly hp: number; readonly maxHp: number; readonly mana: number; readonly maxMana: number } }) {
  const progress = character?.progress;
  return <View style={styles.character}>
    <View style={styles.partyHeader}><Text style={styles.characterName}>{character?.name ?? "Sem-Nome"}</Text><Text style={styles.level}>Nível {progress?.level ?? 1}</Text></View>
    <ResourceRow label="Exp" value={progress?.xp ?? 0} max={55} color="#6b8f4f" />
    <ResourceRow label="Vida" value={combatant?.hp ?? 0} max={combatant?.maxHp ?? 1} color="#8a2525" />
    <ResourceRow label="Mana" value={combatant?.mana ?? 0} max={combatant?.maxMana ?? 1} color="#2f4a6b" />
    <Text style={styles.muted}>{progress?.unspentAttributePoints ?? 0} pontos a distribuir</Text>
  </View>;
}

function ResourceRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <View style={styles.resourceRow}><Text style={styles.resourceLabel}>{label}</Text><Bar value={value} max={max} color={color} /><Text style={styles.resourceValue}>{Math.ceil(value)} / {Math.ceil(max)}</Text></View>;
}

function Panel({ panel, state, inventoryPage, onInventoryPage, onClose }: { panel: Exclude<GamePanel, null>; state: ReturnType<typeof useGameViewModel>["state"]; inventoryPage: number; onInventoryPage: (page: number) => void; onClose: () => void }) {
  const primary = state?.roster.characters[0]?.progress.attributes;
  const combatStats = state?.run?.combat?.combatants.find(({ snapshot }) => snapshot.side === "party")?.snapshot.stats;
  const derived = [{ label: "Vigor (HP)", value: combatStats?.maxHp ?? 0 }, { label: "Dano", value: combatStats?.damage ?? 0 }, { label: "Defesa", value: combatStats?.defense ?? 0 }, { label: "Penetração", value: combatStats?.penetration ?? 0 }, { label: "Cadência", value: combatStats?.attacksPerSecond ?? 0 }, { label: "Crítico", value: combatStats?.criticalChancePercent ?? 0 }];
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.scrim}><View style={[styles.modal, panel === "stats" && styles.modalNarrow]}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{panel === "inventory" ? "INVENTÁRIO" : panel === "stats" ? "ATRIBUTOS" : panel === "bestiary" ? "BESTIÁRIO · MUNDO 0, VESTÍBULO" : "SISTEMAS"}</Text><Pressable style={styles.closeButton} onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View><View style={styles.modalBody}>
    {panel === "inventory" && <View><View style={styles.inventoryToolbar}><Pressable style={styles.toolButton}><Text style={styles.toolButtonText}>◍ Poções</Text></Pressable><View style={styles.grow} /><Text style={styles.label}>OCUPADOS</Text><Text style={styles.value}>{state?.inventory.items.length ?? 0} / {state?.inventory.capacity ?? 128}</Text><View style={styles.pager}><Pressable disabled={inventoryPage === 0} onPress={() => onInventoryPage(inventoryPage - 1)}><Text style={[styles.pagerButton, inventoryPage === 0 && styles.pagerDisabled]}>‹</Text></Pressable><Text style={styles.value}>{inventoryPage + 1} / 3</Text><Pressable disabled={inventoryPage === 2} onPress={() => onInventoryPage(inventoryPage + 1)}><Text style={[styles.pagerButton, inventoryPage === 2 && styles.pagerDisabled]}>›</Text></Pressable></View></View><View style={styles.inventoryGrid}>{Array.from({ length: 48 }, (_, index) => { const stack = state?.inventory.items[inventoryPage * 48 + index]; return <View key={index} style={[styles.inventoryCell, stack && styles.inventoryCellFilled]}><Text style={styles.inventoryGlyph}>{stack ? stack.item.kind === "equipment" ? "◆" : "◉" : "·"}</Text></View>; })}</View></View>}
    {panel === "stats" && <View style={styles.statsColumns}><View style={styles.statsColumn}><Text style={styles.helper}>PRIMÁRIOS</Text>{attributeLabels.map(([key, label]) => <View key={key} style={styles.attrRow}><Text style={styles.attrLabel}><Text style={styles.attrKey}>{key.toUpperCase()}</Text> {label}</Text><Text style={styles.statValue}>{primary?.[key] ?? 0}</Text><Text style={styles.plus}>+</Text></View>)}</View><View style={styles.statsColumn}><Text style={styles.helper}>DERIVADOS</Text>{derived.map(({ label, value }) => <View key={label} style={styles.derivedRow}><Text style={styles.derivedLabel}>{label}</Text><Text style={styles.statValue}>{Number(value).toFixed(label === "Cadência" || label === "Crítico" ? 1 : 0)}{label === "Cadência" ? " /s" : label === "Crítico" ? "%" : ""}</Text></View>)}</View></View>}
    {panel === "bestiary" && <View style={styles.bestiaryGrid}>{WORLD_0_CONTENT.enemies.map((enemy) => <View key={enemy.id} style={[styles.beastCard, enemy.id === "caronte" && styles.beastBoss]}><Text style={styles.beastGlyph}>{enemy.id === "caronte" ? "♛" : "☠"}</Text><View style={styles.beastInfo}><Text style={styles.beastName}>{enemy.name}</Text><Text style={styles.beastRole}>{enemy.id === "caronte" ? "GUARDIÃO" : "CRIATURA"}</Text><Text style={styles.muted}>DANO {enemy.stats.damage} · DROP —</Text><Text style={styles.muted}>HP {enemy.stats.maxHp} · CADÊNCIA {enemy.stats.attacksPerSecond}/s</Text></View></View>)}</View>}
    {panel === "systems" && <View>
      <Text style={styles.helper}>Mecânicas ativas na run real</Text>
      <Text style={styles.item}>Equipamento: {state?.roster.equipmentLoadouts["character-1"]?.equipped.weapon?.name ?? "nenhum"}</Text>
      <Text style={styles.item}>Spells: {state?.roster.spellLoadouts["character-1"]?.entries.map(({ spellId }) => spellId).join(", ") || "nenhuma"}</Text>
      <Text style={styles.item}>Ossuary: {state?.ossuary.bones ?? 0} ossos · {state?.ossuary.unlockedUpgradeIds.length ?? 0} upgrades</Text>
      <Text style={styles.item}>Party: {state?.party.characterIds.length ?? 0}/4 · XP compartilhado</Text>
      <Text style={styles.item}>Combate: tick determinístico · seed persistida</Text>
    </View>}
  </View></View></View></Modal>;
}

function Bar({ value, max, color = "#8a2525" }: { value: number; max: number; color?: string }) {
  return <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(0, Math.min(100, value / Math.max(1, max) * 100))}%`, backgroundColor: color }]} /></View>;
}

function Metric({ label, value, tone, icon }: { label: string; value: string; tone?: "pos" | "neg"; icon?: React.ReactNode }) {
  const cor = tone === "pos" ? styles.valuePos : tone === "neg" ? styles.valueNeg : undefined;
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.metricLinha}>
        {icon}
        <Text style={[styles.value, cor]}>{value}</Text>
      </View>
    </View>
  );
}

/* Ícones desenhados com Views, não com emoji nem fonte de ícone.
   Emoji renderiza diferente em cada plataforma (e no Android muitos nem
   existem), e webfont de ícone não sobrevive ao empacotamento nativo. Três
   formas simples resolvem, e resolvem igual no iOS, no Android e na web. */
function Lua() {
  // crescente por subtração: um disco claro com um disco do fundo por cima
  return (
    <View style={styles.icone}>
      <View style={styles.luaDisco} />
      <View style={styles.luaSombra} />
    </View>
  );
}

function Ondas() {
  return (
    <View style={styles.icone}>
      {[0, 1, 2].map((n) => <View key={n} style={[styles.ondaLinha, { top: 3 + n * 4 }]} />)}
    </View>
  );
}

function Moedas() {
  // pilha vista de lado: três elipses empilhadas, a de cima mais clara
  return (
    <View style={styles.icone}>
      {[0, 1, 2].map((n) => (
        <View key={n} style={[styles.moeda, { bottom: 1 + n * 3.5, backgroundColor: n === 2 ? "#f0c04a" : "#c99a2e" }]} />
      ))}
    </View>
  );
}

/* Tempo de sessão a partir do relógio da simulação, não do de parede: com
   pausa e velocidade 3x o relógio do mundo mentiria sobre quanto jogo passou,
   e é o jogo que produziu os outros números da fileira. */
function mmss(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dois = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dois(m)}:${dois(r)}` : `${m}:${dois(r)}`;
}
function GameButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{label}</Text></Pressable>; }
function HudButton({ label, onPress }: { label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.hudButton}><Text style={styles.hudButtonText}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0a0705" }, content: { padding: 18, paddingBottom: 48, gap: 12, maxWidth: 1060, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }, title: { color: "#d9c9a8", fontSize: 17, fontWeight: "700", letterSpacing: 3 }, subtitle: { color: "#6b5a44", fontSize: 11, marginTop: 3 }, status: { color: "#ff9a3c", fontSize: 11, letterSpacing: 2 },
  hud: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 12, backgroundColor: "#17110d", borderColor: "#2e241b", borderWidth: 1, padding: 9 }, metric: { flexGrow: 1, flexBasis: 118, minWidth: 118, paddingHorizontal: 14, paddingVertical: 10, gap: 3, backgroundColor: "#17110d", borderRightColor: "#241b14", borderRightWidth: 1 }, label: { color: "#6b5a44", fontSize: 9, letterSpacing: 1 }, value: { color: "#d9c9a8", fontSize: 15, fontVariant: ["tabular-nums"] }, event: { color: "#b9a891", fontSize: 10, flex: 1, minWidth: 120 }, hudIcons: { flexDirection: "row", gap: 5 }, hudButton: { backgroundColor: "#241b14", borderColor: "#4a3a2a", borderWidth: 1, paddingHorizontal: 9, paddingVertical: 6 }, hudButtonText: { color: "#a89273", fontSize: 9, letterSpacing: 1 },
  scene: { height: 400, overflow: "hidden", backgroundColor: "#0d0a08", borderColor: "#2e241b", borderWidth: 1, position: "relative" }, ceiling: { position: "absolute", top: 34, left: 0, right: 0, height: 42, backgroundColor: "#231f1d", overflow: "hidden", paddingTop: 4 }, ceilingTexture: { color: "#524737", fontSize: 16, lineHeight: 17, letterSpacing: 2, opacity: 0.55 }, skyGlow: { position: "absolute", top: 76, left: "35%", width: "30%", height: "58%", backgroundColor: "#3a2416", opacity: 0.3 }, arch: { alignItems: "center", paddingTop: 12, zIndex: 1 }, archText: { color: "#a89273", fontSize: 10, letterSpacing: 3 }, wall: { position: "absolute", top: 76, left: 0, right: 0, bottom: 44, backgroundColor: "#241b18", opacity: 0.88 }, skull: { position: "absolute", color: "#514137", fontSize: 22, opacity: 0.55 }, column: { position: "absolute", top: 70, bottom: 44, width: 14, backgroundColor: "#4a3a2a", borderLeftColor: "#a89273", borderLeftWidth: 2, zIndex: 1 }, capital: { position: "absolute", top: -5, left: -7, right: -7, height: 9, backgroundColor: "#6b5a44" }, torch: { position: "absolute", top: 74, left: -6, width: 26, height: 24, alignItems: "center", backgroundColor: "#3b2112" }, flame: { color: "#ff9a3c", fontSize: 17 }, floor: { position: "absolute", bottom: 0, left: 0, right: 0, height: 44, backgroundColor: "#17110d", borderTopColor: "#4a3a2a", borderTopWidth: 1 }, sceneParty: { position: "absolute", bottom: 54, alignItems: "center", zIndex: 2 }, hero: { color: "#d9c9a8", fontSize: 42 }, heroMoving: { transform: [{ translateY: -2 }] }, heroName: { color: "#a89273", fontSize: 9 }, enemies: { position: "absolute", left: 0, right: 0, bottom: 54, height: 120, zIndex: 2 }, enemy: { position: "absolute", alignItems: "center", width: 70 }, enemySprite: { height: 82, justifyContent: "flex-end" }, enemyGlyph: { color: "#968a80", fontSize: 29 }, ghostEnemy: { opacity: 0.55 }, enemyName: { color: "#8a7860", fontSize: 8, maxWidth: 60, textAlign: "center" }, feedback: { position: "absolute", left: 0, right: 0, top: 0, height: 260, zIndex: 5 }, feedbackText: { position: "absolute", fontSize: 15, fontWeight: "700", textShadowColor: "#0a0705", textShadowRadius: 2 }, sceneHint: { position: "absolute", bottom: 10, left: 10, color: "#6b5a44", fontSize: 9, zIndex: 3 },
  bar: { height: 9, flex: 1, minWidth: 0, backgroundColor: "#241b14", borderColor: "#382a1e", borderWidth: 1, overflow: "hidden", marginTop: 5 }, resourceRow: { flexDirection: "row", alignItems: "center", gap: 8 }, resourceLabel: { width: 34, color: "#6b5a44", fontSize: 10 }, resourceValue: { width: 66, color: "#9a8a70", fontSize: 10, textAlign: "right" }, partyBar: { backgroundColor: "#17110d", borderColor: "#2e241b", borderWidth: 1, padding: 14 }, partyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }, sectionTitle: { color: "#a89273", fontSize: 11, letterSpacing: 2, fontWeight: "700" }, muted: { color: "#6b5a44", fontSize: 10 }, hint: { color: "#5d4d3a", fontSize: 10, lineHeight: 16, marginTop: 12, maxWidth: "74%" }, partyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }, character: { backgroundColor: "#1c1510", borderColor: "#33261a", borderWidth: 1, padding: 12, width: "24%", minWidth: 0, gap: 8 }, characterName: { color: "#d9c9a8", fontSize: 14 }, level: { color: "#7a6850", fontSize: 11 }, locked: { backgroundColor: "#1c1510", borderColor: "#2c2118", borderStyle: "dashed", borderWidth: 1, padding: 12, width: "24%", minWidth: 0, justifyContent: "center" }, lockedTitle: { color: "#4e4132", fontSize: 12, letterSpacing: 1 }, controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, button: { backgroundColor: "#17110d", borderColor: "#3a2c1f", borderWidth: 1, paddingHorizontal: 13, paddingVertical: 9 }, buttonText: { color: "#a89273", fontSize: 10, letterSpacing: 1 }, ledger: { flexDirection: "row", flexWrap: "wrap", gap: 0, backgroundColor: "#241b14", borderColor: "#241b14", borderWidth: 1 }, scrim: { flex: 1, backgroundColor: "rgba(6,4,3,0.72)", justifyContent: "flex-start", padding: 40 }, modal: { width: "100%", maxWidth: 880, alignSelf: "center", maxHeight: "90%", backgroundColor: "#17110d", borderColor: "#3a2c1f", borderWidth: 1, padding: 0 }, modalNarrow: { maxWidth: 620 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomColor: "#241b14", borderBottomWidth: 1, backgroundColor: "#1b140e" }, modalTitle: { color: "#d9c9a8", fontSize: 12, letterSpacing: 2, fontWeight: "600" }, modalBody: { padding: 16 }, closeButton: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderColor: "#3a2c1f", borderWidth: 1 }, close: { color: "#a89273", fontSize: 17, lineHeight: 20 }, helper: { color: "#6b5a44", fontSize: 10, letterSpacing: 1, marginBottom: 10 }, item: { color: "#d9c9a8", fontSize: 12, paddingVertical: 7 }, statRow: { flexDirection: "row", justifyContent: "space-between", borderBottomColor: "#2e241b", borderBottomWidth: 1 }, statValue: { color: "#d9c9a8", fontSize: 13, fontVariant: ["tabular-nums"] }, bestRow: { borderBottomColor: "#2e241b", borderBottomWidth: 1, paddingVertical: 8 }, grow: { flex: 1 }, inventoryToolbar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }, toolButton: { backgroundColor: "#241b14", borderColor: "#3f2f20", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 }, toolButtonText: { color: "#a89273", fontSize: 11, letterSpacing: 1 }, pager: { flexDirection: "row", alignItems: "center", gap: 6 }, pagerButton: { backgroundColor: "#241b14", borderColor: "#3f2f20", borderWidth: 1, color: "#a89273", fontSize: 18, lineHeight: 22, textAlign: "center", width: 26, height: 24 }, inventoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginBottom: 10 }, inventoryCell: { width: "6.25%", minWidth: 24, aspectRatio: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#16100c", borderColor: "#261c14", borderWidth: 1 }, inventoryCellFilled: { backgroundColor: "#1d1610", borderColor: "#6b4a26" }, inventoryGlyph: { color: "#4a3f33", fontSize: 13 }, statsColumns: { flexDirection: "row", gap: 22 }, statsColumn: { flex: 1, minWidth: 0 }, attrRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }, attrLabel: { flex: 1, color: "#a89273", fontSize: 12 }, attrKey: { color: "#6b5a44", fontSize: 10, letterSpacing: 1 }, plus: { width: 24, height: 22, color: "#ff9a3c", borderColor: "#3f2f20", borderWidth: 1, textAlign: "center", lineHeight: 20, fontSize: 14 }, derivedRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 }, derivedLabel: { color: "#7a6850", fontSize: 12 }, bestiaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, beastCard: { flexDirection: "row", gap: 12, backgroundColor: "#1c1510", borderColor: "#33261a", borderWidth: 1, padding: 12, width: "48%", minWidth: 230 }, beastBoss: { borderColor: "#5c3a1c", backgroundColor: "#1f1610" }, beastInfo: { flex: 1, minWidth: 0 }, beastName: { color: "#d9c9a8", fontSize: 12, marginBottom: 2 }, beastRole: { color: "#6b5a44", fontSize: 10, letterSpacing: 1 }, beastGlyph: { color: "#a89273", fontSize: 30, width: 42, textAlign: "center" },
  barFill: { height: "100%" }, pagerDisabled: { opacity: 0.35 },
  analyzerHeader: { backgroundColor: "#1b140e", borderColor: "#241b14", borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 14, paddingVertical: 9 },
  valuePos: { color: "#7fa86b" }, valueNeg: { color: "#b4534b" },
  metricLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  icone: { width: 14, height: 14 },
  luaDisco: { position: "absolute", left: 0, top: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: "#d9c9a8" },
  luaSombra: { position: "absolute", left: 4, top: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: "#17110d" },
  ondaLinha: { position: "absolute", left: 0, width: 14, height: 2, borderRadius: 1, backgroundColor: "#7f9bb0" },
  moeda: { position: "absolute", left: 0, width: 14, height: 5, borderRadius: 3 },
});
