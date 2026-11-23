import * as THREE from "three";
import { G, Kit, animateHuman, base, buildHuman, grip, type AnimState, type Human, type Style } from "./rig";

/* Os bonecos do Vestíbulo, montados sobre o rig procedural (rig.ts).

   Cada boneco tem os PRÓPRIOS materiais (clones dos do Kit): o clarão de acerto
   mexe no emissivo, e com material compartilhado o golpe num Ignavo acenderia a
   horda inteira. É um programa de shader só — clonar custa um uniform, não uma
   compilação. A geometria continua compartilhada e em cache: nunca dar dispose
   nela. */

export interface Boneco {
  root: THREE.Group;
  human: Human;
  mats: THREE.MeshStandardMaterial[];
  estilo: Style;
  /** altura da cabeça, já com a escala — onde nasce a barra e o número */
  altura: number;
  /** o Ignavo anda curvado; o cavaleiro, de pé */
  curva: number;
  sombra: THREE.Mesh;
  poca?: THREE.Mesh;
}

const sombraGeo = new THREE.CircleGeometry(0.32, 20).rotateX(-Math.PI / 2);
const sombraMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false });
const pocaGeo = new THREE.CircleGeometry(0.5, 18).rotateX(-Math.PI / 2);
/* Sangue molhado: pouca rugosidade para a tocha brilhar nele. Metal não —
   sem mapa de ambiente, superfície metálica reflete o nada e vira buraco preto. */
const pocaMat = new THREE.MeshStandardMaterial({ color: 0x4a0606, roughness: 0.25, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });

function materiaisProprios(root: THREE.Object3D): THREE.MeshStandardMaterial[] {
  const troca = new Map<THREE.Material, THREE.MeshStandardMaterial>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || o.material === sombraMat || o.material === pocaMat) return;
    const original = o.material as THREE.MeshStandardMaterial;
    let m = troca.get(original);
    if (!m) { m = original.clone(); troca.set(original, m); }
    o.material = m;
  });
  return [...troca.values()];
}

function finaliza(root: THREE.Group, human: Human, estilo: Style, escala: number, curva: number, comPoca: boolean): Boneco {
  root.scale.setScalar(escala);
  const sombra = new THREE.Mesh(sombraGeo, sombraMat);
  sombra.position.y = 0.012;
  root.add(sombra);
  let poca: THREE.Mesh | undefined;
  if (comPoca) {
    poca = new THREE.Mesh(pocaGeo, pocaMat);
    poca.position.set(-0.45, 0.008, 0);
    poca.visible = false;
    root.add(poca);
  }
  return { root, human, mats: materiaisProprios(root), estilo, altura: 1.05 * escala, curva, sombra, poca };
}

/* ------------------------------------------------------------- o herói */

const FERRO = 0x6a7078;
const FERRO_ESCURO = 0x3a3e44;
const SOBREVESTE = 0x5c1010;
const CAPA = 0x2e0707;
const COURO = 0x2a1a10;
const OSSO = 0xcfc3a4;

/** Cavaleiro de armadura escura, sobreveste cor de sangue seco, elmo fechado
    com chifres de osso — o mesmo papel do 2D SL Knight, agora com volume. */
export function cavaleiro(): Boneco {
  const { root, body } = base();
  const h = buildHuman(body, {
    skin: 0x8a6a58, hair: null, beard: null,
    shirt: FERRO_ESCURO, skirt: SOBREVESTE, sleeve: FERRO, pants: FERRO_ESCURO, boot: 0x1b1714, belt: COURO,
    bulk: 1.18, limb: 1.15, semRosto: true,
  }, {
    torso: (k) => {
      // sobreveste por cima da cota, e as ombreiras
      k.add(G.box(0.05, 0.26, 0.2), SOBREVESTE, [0.105, 0.12, 0]);
      k.metalPart(G.sphere(0.085), FERRO, [0, 0.27, 0.19], [0, 0, 0], [1.1, 0.75, 1]);
      k.metalPart(G.sphere(0.085), FERRO, [0, 0.27, -0.19], [0, 0, 0], [1.1, 0.75, 1]);
      k.metalPart(G.cone(0.025, 0.08, 6), OSSO, [0, 0.33, 0.21], [0.5, 0, 0]);
      k.metalPart(G.cone(0.025, 0.08, 6), OSSO, [0, 0.33, -0.21], [-0.5, 0, 0]);
    },
    head: (k) => {
      // elmo fechado: calota, máscara e a fenda escura dos olhos
      k.metalPart(G.sphere(0.118), FERRO, [0, 0.005, 0], [0, 0, 0], [1.02, 1.05, 0.98]);
      k.metalPart(G.box(0.03, 0.12, 0.17), FERRO_ESCURO, [0.1, -0.02, 0]);
      k.add(G.box(0.012, 0.016, 0.13), 0x050303, [0.117, 0.02, 0]);
      // chifres de osso, curvos para trás
      k.add(G.cone(0.03, 0.16, 7), OSSO, [-0.02, 0.1, 0.09], [0.6, 0, 0.6]);
      k.add(G.cone(0.03, 0.16, 7), OSSO, [-0.02, 0.1, -0.09], [-0.6, 0, 0.6]);
    },
    cape: (k) => {
      k.add(G.box(0.03, 0.5, 0.3), CAPA, [-0.16, 0.05, 0]);
    },
  });
  // espada longa na direita
  new Kit()
    .add(G.cyl(0.018, 0.018, 0.12, 6), COURO, [0, 0.0, 0])
    .metalPart(G.box(0.03, 0.025, 0.18), FERRO_ESCURO, [0, -0.07, 0])
    .metalPart(G.box(0.012, 0.62, 0.05), 0x9aa0a8, [0, -0.39, 0])
    .bake(grip(h.armR.c, 1.25));
  // escudo redondo de ferro na esquerda, com um crânio cravado
  new Kit()
    .metalPart(G.cyl(0.17, 0.17, 0.03, 14), FERRO_ESCURO, [0, -0.02, 0.05], [Math.PI / 2, 0, 0])
    .metalPart(G.torus(0.165, 0.014), FERRO, [0, -0.02, 0.066])
    .add(G.sphere(0.05, 10, 8), OSSO, [0, -0.02, 0.08], [0, 0, 0], [1, 1, 0.6])
    .bake(h.armL.c);
  return finaliza(root, h, "sword", 1.15, 0, false);
}

/* ------------------------------------------------------------ a horda */

interface Especie { pele: number; tanga: number; escala: number; bulk: number; limb: number; belly: number; ferida: number }

/* Uma receita por espécie do world-0. Mesmo corpo, proporção e cor diferentes:
   a leitura de "quem é quem" vem da silhueta, como no bestiário. */
const ESPECIES: Record<string, Especie> = {
  Ignavo:    { pele: 0x8c8f86, tanga: 0x2e241c, escala: 0.95, bulk: 0.82, limb: 0.82, belly: 0, ferida: 0x6a0d0a },
  Moscardo:  { pele: 0x4d4a38, tanga: 0x1e1a12, escala: 0.72, bulk: 0.8, limb: 0.75, belly: 0.02, ferida: 0x5a3a0a },
  Gorja:     { pele: 0x7d5a50, tanga: 0x3a1a14, escala: 1.15, bulk: 1.45, limb: 1.2, belly: 0.07, ferida: 0x8a0e0a },
  Encalhado: { pele: 0x5f605c, tanga: 0x2a2a28, escala: 1.1, bulk: 1.35, limb: 1.3, belly: 0.03, ferida: 0x3a1010 },
  Marcado:   { pele: 0x5a2e2a, tanga: 0x140c0a, escala: 1.08, bulk: 1.1, limb: 1.0, belly: 0, ferida: 0xd8341c },
  Caronte:   { pele: 0x23222a, tanga: 0x0e0d12, escala: 1.6, bulk: 1.3, limb: 1.1, belly: 0, ferida: 0x9a1a10 },
};

/** Ignavo e parentes: vultos nus, sem rosto, com as feridas abertas. */
export function morto(nome: string): Boneco {
  // o nome pode vir com título ("Caronte, o Barqueiro"): a espécie é o que vem antes da vírgula
  const e = ESPECIES[nome.split(",")[0].trim()] ?? ESPECIES.Ignavo;
  const { root, body } = base();
  const h = buildHuman(body, {
    skin: e.pele, hair: null, beard: null,
    shirt: e.pele, skirt: e.tanga, sleeve: e.pele, pants: e.pele, boot: e.pele, belt: e.tanga,
    bulk: e.bulk, limb: e.limb, belly: e.belly, semRosto: true,
  }, {
    torso: (k) => {
      // costelas à mostra e feridas abertas
      for (let i = 0; i < 4; i += 1) k.add(G.box(0.012, 0.012, 0.2 * e.bulk), 0x2a2622, [0.1 * e.bulk, 0.1 + i * 0.04, 0]);
      k.add(G.sphere(0.035, 8, 6), e.ferida, [0.1 * e.bulk, 0.2, 0.06], [0, 0, 0], [0.6, 1, 1.2]);
      k.add(G.sphere(0.028, 8, 6), e.ferida, [-0.08 * e.bulk, 0.15, -0.08], [0, 0, 0], [0.6, 1.3, 1]);
    },
    head: (k) => {
      // a boca é um rasgo vermelho onde deveria haver rosto
      k.add(G.box(0.02, 0.025, 0.09), e.ferida, [0.093, -0.035, 0]);
      k.add(G.box(0.016, 0.06, 0.012), e.ferida, [0.095, -0.01, 0.025]);
    },
  });
  return finaliza(root, h, "tool", e.escala, -0.32, true);
}

/* ------------------------------------------------------------ animação */

/** Pose viva: o animador do Klongor, mais a curvatura de quem é morto-vivo. */
export function anima(b: Boneco, s: AnimState) {
  b.human.body.rotation.z = 0;
  animateHuman(b.human, s, b.estilo);
  b.human.torso.rotation.z += b.curva;
  b.human.head.rotation.z -= b.curva * 0.6;
}

const suaviza = (k: number) => k * k * (3 - 2 * k);

/** Queda para trás em ~0,5 s e o corpo afundando no chão no fim.
    Afundar no lugar de desvanecer evita material transparente por boneco — com
    transparência as peças de um mesmo corpo brigam pela ordem de desenho. */
export function morre(b: Boneco, t: number, afunda: number) {
  const k = suaviza(Math.min(1, Math.max(0, t / 0.5)));
  anima(b, { t, phase: 0, moving: false, working: false, since: 99, seed: 3, walk: 0 });
  b.human.body.rotation.z = k * 1.45;
  b.human.body.position.set(-k * 0.08, k * 0.1 - afunda * 0.45, 0);
  b.human.armL.a.rotation.z = 2.2 * k;
  b.human.armR.a.rotation.z = 1.6 * k;
  b.human.legL.b.rotation.z = -0.5 * k;
  b.sombra.visible = afunda === 0;
  if (b.poca) {
    b.poca.visible = t > 0.25;
    b.poca.scale.setScalar(Math.min(1, Math.max(0.05, (t - 0.25) / 1.2)) * (1 - afunda));
  }
}

/* Pisca de acerto puxado para o vermelho e contido. Branco a 0,9 numa cena
   escura estourava o boneco inteiro — e no começo da noite todo mundo apanha
   a cada fração de segundo, então a horda ficava branca o tempo todo. */
export function clarao(b: Boneco, intensidade: number) {
  const i = Math.min(1, intensidade) ** 2;   // cai rápido: lê como pancada, não como estado
  for (const m of b.mats) m.emissive.setRGB(i * 0.2, i * 0.02, i * 0.01);
}

export function descarta(b: Boneco) {
  for (const m of b.mats) m.dispose();
  b.root.removeFromParent();
}
