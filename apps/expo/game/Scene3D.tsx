import { memo, useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Canvas, useFrame, useThree } from "./scene3d/Tela";
import * as THREE from "three";
import {
  ATRASO_CORPO, FADE_CORPO, HEROI_X, LIMITE_DO_CORPO, PROFUNDIDADE_DA_FILEIRA, VIDA_BARRA_MOB, VIDA_CLARAO,
  VIDA_CUSPE, VIDA_NUMERO, W, aproximacao, fileiraDe, perfilDoMob, posicaoMob, sinalVivo, slotMob,
} from "./sceneLayout";
import type { SceneProps } from "./sceneLayout";
import { anima, cavaleiro, clarao, descarta, morre, morto, type Boneco } from "./scene3d/bonecos";
import { montaVestibulo } from "./scene3d/vestibulo";

/* Cena do Vestíbulo em 3D (three.js via @react-three/fiber; expo-gl no nativo,
   WebGL no web). Recebe exatamente as mesmas props da cena Skia e põe cada
   bicho no mesmo lugar dela — o layout vem de `sceneLayout.ts`.

   Tudo é dirigido pelo `time` das props, nunca pelo relógio do r3f: os epochs
   de golpe, acerto, morte e número estão no tempo do ViewModel, e com dois
   relógios o clarão sairia fora do golpe.

   O palco continua sendo o de 960×384 px; `PX` converte para unidades do mundo,
   com o herói na origem e a horda vindo de +X. A profundidade da fileira vira
   Z de verdade. Nome, barras e números continuam como Views por cima do canvas
   — texto em WebGL no nativo exigiria atlas de fonte — posicionadas pela
   projeção da mesma câmera. */

const H = 384;
const PX = 1 / 85;                      // unidades do mundo por px do palco
const Z_HEROI = -0.25;
const FOCO_X = (W / 2 - HEROI_X) * PX;   // centro do quadro, em x do mundo

const xDoPalco = (px: number) => (px - HEROI_X) * PX;
function zDaHorda(i: number, id?: string) {
  const profundidade = id ? perfilDoMob(id).profundidade : 0;
  return Z_HEROI + 0.05 - (fileiraDe(i) * PROFUNDIDADE_DA_FILEIRA + profundidade + 8) * 0.045;
}

function novaCamera() {
  const c = new THREE.PerspectiveCamera(22, W / H, 0.1, 60);
  c.position.set(FOCO_X, 1.85, 9.4);
  c.lookAt(FOCO_X, 1.05, -0.6);
  return c;
}

/* ------------------------------------------------------------------ mundo */

type Estado = ReturnType<typeof montaMundo>;

function montaMundo() {
  const raiz = new THREE.Group();
  const vestibulo = montaVestibulo();
  raiz.add(vestibulo.raiz);

  const heroi = cavaleiro();
  heroi.root.position.set(0, 0, Z_HEROI);
  raiz.add(heroi.root);

  /* Luz do inferno: pouca ambiente puxada para o vermelho, uma chave morna
     vinda da frente e um contraluz vermelho por trás que recorta as silhuetas
     da horda contra a parede escura. */
  const ambiente = new THREE.HemisphereLight(0x7a3424, 0x0a0405, 1.3);
  const chave = new THREE.DirectionalLight(0xffc49a, 1.7);
  chave.position.set(-3, 5, 7);
  const contra = new THREE.DirectionalLight(0xff2a0a, 2.2);
  contra.position.set(6, 3, -7);
  raiz.add(ambiente, chave, contra);

  const gotaGeo = new THREE.SphereGeometry(0.032, 6, 5);
  const gotaMat = new THREE.MeshBasicMaterial({ color: 0x9a120c });
  const gotas = Array.from({ length: 36 }, () => {
    const g = new THREE.Mesh(gotaGeo, gotaMat);
    g.visible = false;
    raiz.add(g);
    return g;
  });

  return {
    raiz, vestibulo, heroi, gotas,
    vivos: new Map<string, Boneco>(),
    corpos: new Map<string, Boneco>(),
    nomes: new Map<string, string>(),
    passoHeroi: 0,
  };
}

function quadro(m: Estado, p: SceneProps, dt: number) {
  const { time, animations, hits } = p;
  const andando = p.status === "walking" || p.status === "retreating";
  const suave = aproximacao(p.marcha ?? 1);
  const claraoDe = (id?: string) => {
    const quando = id ? hits?.[id] : undefined;
    return quando === undefined ? 0 : Math.max(0, 1 - (time - quando) / VIDA_CLARAO);
  };
  const flinch = (s?: { animation: string; epoch: number }) =>
    s?.animation === "hurt" ? Math.max(0, 1 - (time - s.epoch) / 0.3) : 0;

  m.vestibulo.atualiza((p.camera ?? 0) * PX, time, FOCO_X);

  // herói — sai do passo e para nele com mola, em vez de trocar de pose num quadro
  m.passoHeroi += ((andando ? 1 : 0) - m.passoHeroi) * Math.min(1, dt * 5);
  const sh = sinalVivo(animations, time, p.partyId);
  if (sh?.animation === "dead") morre(m.heroi, time - sh.epoch, 0);
  else anima(m.heroi, {
    t: time, phase: time * 9.5, moving: andando, working: false, seed: 1, walk: m.passoHeroi, dt,
    since: sh?.animation === "attack" ? time - sh.epoch : 99, flinch: flinch(sh),
  });
  clarao(m.heroi, claraoDe(p.partyId));

  // horda viva
  const vistos = new Set<string>();
  let gota = 0;
  if (p.status === "combat" || suave > 0) p.enemies.forEach((e, i) => {
    if (animations[e.id]?.animation === "dead") return;
    vistos.add(e.id);
    m.nomes.set(e.id, e.name);
    let b = m.vivos.get(e.id);
    if (!b) {
      b = morto(e.name);
      b.root.rotation.y = Math.PI;         // encaram o herói
      m.raiz.add(b.root);
      m.vivos.set(e.id, b);
    }
    const x = xDoPalco(posicaoMob(i, e.id, suave));
    const z = zDaHorda(i, e.id);
    b.root.position.set(x, 0, z);
    const vivo = sinalVivo(animations, time, e.id);
    const anda = !vivo && (andando || suave < 1);
    anima(b, {
      t: time + i * 0.37, phase: time * 8.5 * perfilDoMob(e.id).ritmo + i * 1.3, moving: anda, working: false,
      seed: i + 2, walk: anda ? 1 : 0, dt,
      since: vivo?.animation === "attack" ? time - vivo.epoch : 99, flinch: flinch(vivo),
    });
    clarao(b, claraoDe(e.id));

    /* Cuspida de sangue: três gotas da boca rasgada até o peito do herói, como
       na cena 2D — sem isso o golpe do bicho só existia no número do HUD. */
    const golpe = animations[e.id];
    const idade = golpe?.animation === "attack" ? time - golpe.epoch : -1;
    if (idade >= 0 && idade <= VIDA_CUSPE) {
      const avanco = idade / VIDA_CUSPE;
      for (let n = 0; n < 3 && gota < m.gotas.length; n += 1) {
        const k = Math.max(0, Math.min(1, avanco - n * 0.16));
        const g = m.gotas[gota++];
        g.visible = k > 0 && k < 1;
        g.position.set(
          x - 0.12 + (0.2 - x + 0.12) * k,
          b.altura * 0.82 + Math.sin(k * Math.PI) * 0.18 - k * k * 0.25,
          z + (Z_HEROI - z) * k,
        );
        g.scale.setScalar(1 - n * 0.2);
      }
    }
  });
  for (let g = gota; g < m.gotas.length; g += 1) m.gotas[g].visible = false;

  // corpos: o morto vira corpo no mesmo boneco, sem trocar de modelo no meio da queda
  const corposVistos = new Set<string>();
  for (const corpo of p.corpses ?? []) {
    const idade = time - corpo.epoch;
    if (idade > ATRASO_CORPO + FADE_CORPO) continue;
    const px = slotMob(corpo.indice) - ((p.camera ?? 0) - corpo.camera);
    if (px < LIMITE_DO_CORPO || px > W + 420) continue;
    let b = m.corpos.get(corpo.id);
    if (!b) {
      b = m.vivos.get(corpo.combatantId);
      if (b) m.vivos.delete(corpo.combatantId);
      else {
        b = morto(m.nomes.get(corpo.combatantId) ?? "Ignavo");
        b.root.rotation.y = Math.PI;
        m.raiz.add(b.root);
      }
      m.corpos.set(corpo.id, b);
    }
    corposVistos.add(corpo.id);
    b.root.position.set(xDoPalco(px), 0, zDaHorda(corpo.indice, corpo.combatantId));
    morre(b, idade, idade <= ATRASO_CORPO ? 0 : (idade - ATRASO_CORPO) / FADE_CORPO);
    clarao(b, claraoDe(corpo.combatantId));
  }

  for (const [id, b] of m.vivos) if (!vistos.has(id)) { descarta(b); m.vivos.delete(id); }
  for (const [id, b] of m.corpos) if (!corposVistos.has(id)) { descarta(b); m.corpos.delete(id); }
}

const Mundo = memo(function Mundo({ dados }: { dados: RefObject<SceneProps> }) {
  const scene = useThree((s) => s.scene);
  const m = useMemo(montaMundo, []);

  useEffect(() => {
    scene.background = new THREE.Color(0x070303);
    /* Névoa cor de brasa apagada: a parede do fundo some num vermelho sujo e
       a horda que entra pela direita sai dela. */
    scene.fog = new THREE.Fog(0x1a0806, 8.5, 19);
    return () => {
      scene.fog = null;
      for (const b of [...m.vivos.values(), ...m.corpos.values()]) descarta(b);
    };
  }, [scene, m]);

  useFrame((_, dt) => {
    if (dados.current) quadro(m, dados.current, dt);
  });
  return <primitive object={m.raiz} />;
});

/* ------------------------------------------------------------ componente */

export function Scene3D(props: SceneProps) {
  const { time, status, enemies, hits, partyName, partyVitals, feedback, partyId, marcha = 1 } = props;
  const dados = useRef(props);
  dados.current = props;

  const { width: janela } = useWindowDimensions();
  const width = Math.min(Math.max(320, janela - 36), 1060);
  const height = (H * width) / W;

  const camera = useMemo(novaCamera, []);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const v = useMemo(() => new THREE.Vector3(), []);
  const naTela = (x: number, y: number, z: number) => {
    v.set(x, y, z).project(camera);
    return { left: ((v.x + 1) / 2) * width, top: ((1 - v.y) / 2) * height };
  };

  const suave = aproximacao(marcha);
  const placa = naTela(0, 1.55, Z_HEROI);

  return (
    <View style={[styles.host, { width, height }]} accessibilityLabel="Cena do Vestíbulo">
      <Canvas camera={camera} style={{ width, height }} gl={{ antialias: true }}>
        <Mundo dados={dados} />
      </Canvas>

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {partyVitals && (
          <View style={[styles.placaHeroi, { left: placa.left - 46, top: placa.top - 30 }]}>
            <Text style={styles.nomeHeroi} numberOfLines={1}>{partyName ?? "Sem-Nome"}</Text>
            <View style={styles.trilhoHeroi}>
              <View style={[styles.encheHeroi, {
                width: `${Math.max(0, Math.min(1, partyVitals.hp / Math.max(1, partyVitals.maxHp))) * 100}%`,
                backgroundColor: "#8a2525",
              }]} />
            </View>
            <View style={styles.trilhoHeroi}>
              <View style={[styles.encheHeroi, {
                width: `${Math.max(0, Math.min(1, partyVitals.mana / Math.max(1, partyVitals.maxMana))) * 100}%`,
                backgroundColor: "#3f5c86",
              }]} />
            </View>
          </View>
        )}

        {/* barra só em quem está apanhando agora — mesma regra da cena 2D */}
        {enemies.map((e, i) => {
          const quando = hits?.[e.id];
          if (quando === undefined || time - quando >= VIDA_BARRA_MOB) return null;
          if (props.animations[e.id]?.animation === "dead") return null;
          const topo = naTela(xDoPalco(posicaoMob(i, e.id, suave)), 1.3, zDaHorda(i, e.id));
          return (
            <View key={`barra:${e.id}`} style={[styles.trilhoMob, { left: topo.left - 20, top: topo.top }]}>
              <View style={[styles.encheMob, { width: `${Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp))) * 100}%` }]} />
            </View>
          );
        })}

        {feedback.map((item) => {
          const idade = time - item.epoch;
          if (idade < 0 || idade > VIDA_NUMERO) return null;
          const indice = enemies.findIndex((e) => e.id === item.alvo);
          const noHeroi = item.alvo === partyId;
          if (indice < 0 && !noHeroi) return null;
          const avanco = 1 - (1 - idade / VIDA_NUMERO) ** 2;
          const ponto = indice >= 0
            ? naTela(xDoPalco(posicaoMob(indice, item.alvo, suave)), 1.25 + avanco * 0.7, zDaHorda(indice, item.alvo))
            : naTela(-0.1, 1.5 + avanco * 0.7, Z_HEROI);
          return (
            <Text key={item.id} style={[styles.numero, {
              color: item.color,
              left: ponto.left + (item.dx ?? 0) * (width / W) - 26,
              top: ponto.top + (item.dy ?? 0) * (width / W),
              opacity: Math.max(0, 1 - idade / VIDA_NUMERO),
            }]}>
              {item.text}
            </Text>
          );
        })}
      </View>

      <Text style={styles.rodape}>
        {status === "combat" ? "A party parou. O combate resolve sozinho."
          : status === "retreating" ? "Recuando para uma margem mais rasa."
          : "A marcha continua…"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { overflow: "hidden", backgroundColor: "#070303", borderColor: "#241b14", borderWidth: 1, position: "relative" },
  placaHeroi: { position: "absolute", width: 92, alignItems: "center", gap: 2 },
  nomeHeroi: { color: "#d9c9a8", fontSize: 9, letterSpacing: 0.5, textShadowColor: "#0a0705", textShadowRadius: 3 },
  trilhoHeroi: { width: 62, height: 4, backgroundColor: "#1b1410", borderColor: "#0a0705", borderWidth: 0.5 },
  encheHeroi: { height: "100%" },
  trilhoMob: { position: "absolute", width: 40, height: 4, backgroundColor: "#1b1410", borderColor: "#0a0705", borderWidth: 0.5 },
  encheMob: { height: "100%", backgroundColor: "#7a2222" },
  numero: { position: "absolute", width: 52, textAlign: "center", fontSize: 14, fontWeight: "700", textShadowColor: "#0a0705", textShadowRadius: 3 },
  rodape: { position: "absolute", left: 10, bottom: 8, color: "#6b5a44", fontSize: 9 },
});
