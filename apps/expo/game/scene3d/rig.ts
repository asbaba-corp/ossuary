import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Rig procedural de humanos — portado do Klongor (`gruntz/src/render/characters.ts`),
 * o projeto irmão em Three.js. Só primitivas: nenhum arquivo de modelo, nada para
 * falhar ao carregar, e cada função pode virar um .glb depois sem mexer no resto.
 *
 * Do original ficaram o Kit (peças fundidas por articulação, cor por vértice), o
 * esqueleto humano e o animador. Saíram os acessórios de RTS e o `stylize` (detalhe
 * por shader), que dependia de uniforms do renderer de lá.
 *
 * Convenção herdada: a frente do boneco é +X, a esquerda +Z, o chão y = 0, altura ~1.
 */


// ───────────────────────────── paleta ─────────────────────────────

export const P = {
  skins: [0xe7b48a, 0xd9a274, 0xc58a5e, 0xf0c7a0, 0xa8724a],
  hairs: [0x3b2414, 0x5a3a1e, 0x7a4f25, 0x2a1d12, 0x8c6a3e, 0x6e6a62],
  linen: 0xcbb68c,
  linenDark: 0x9c8660,
  tunic: 0x8a6a3c,
  tunicDark: 0x6a4f2a,
  leather: 0x5e3e22,
  leatherDark: 0x3e2914,
  boot: 0x3a2716,
  straw: 0xd9b75e,
  strawDark: 0xa98a3e,
  wood: 0x7a5230,
  woodDark: 0x4a3120,
  iron: 0x9aa3aa,
  ironDark: 0x5c6469,
  rust: 0x8a5a3a,
  gold: 0xf0c24c,
  fur: 0x8a7a66,
  furDark: 0x5e5244,
  donkey: 0x8c7f74,
  donkeyLight: 0xcdbfae,
  black: 0x17110b,
  white: 0xf3ead6,
};

// ───────────────────────────── materiais e peças ─────────────────────────────

export const charMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0.04 });
export const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.55 });

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute('uv');
    geoCache.set(key, g);
  }
  return g;
}

export const G = {
  sphere: (r: number, w = 14, h = 10) => cached(`s${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h)),
  /** calota (topo de esfera), pra cabelo e capacete */
  cap: (r: number, frac = 0.55) => cached(`cap${r}:${frac}`, () => new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI * frac)),
  capsule: (r: number, len: number) => cached(`c${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10)),
  cyl: (rt: number, rb: number, h: number, seg = 12) => cached(`y${rt}:${rb}:${h}:${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
  cone: (r: number, h: number, seg = 10) => cached(`k${r}:${h}:${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  box: (w: number, h: number, d: number) => cached(`b${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)),
  torus: (r: number, t: number, arc = Math.PI * 2) => cached(`t${r}:${t}:${arc}`, () => new THREE.TorusGeometry(r, t, 6, 16, arc)),
  lathe: (key: string, pts: [number, number][], seg = 14) =>
    cached(`l${key}`, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg)),
};

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpC = new THREE.Color();

interface KitPart {
  geo: THREE.BufferGeometry;
  color: number;
  matrix: THREE.Matrix4;
}

/** geometrias fundidas, por receita (material + peças). Compartilhadas entre todos os bonecos iguais:
 *  por isso NUNCA podem ser liberadas (dispose) nem alteradas. */
const mergedCache = new Map<string, THREE.BufferGeometry>();

/** número de geometrias fundidas no cache (só pra teste e medição) */
export function kitCacheSize(): number {
  return mergedCache.size;
}

/** junta várias peças coloridas numa malha só (uma por articulação).
 *  A geometria fundida fica em cache e é compartilhada: a malha é nova a cada boneco, a geometria não. */
export class Kit {
  private parts: KitPart[] = [];
  private metal: KitPart[] = [];

  /** peça `geo` na cor `color`, posição/rotação/escala locais */
  add(
    geo: THREE.BufferGeometry,
    color: number,
    pos: [number, number, number] = [0, 0, 0],
    rot: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] | number = 1,
    shiny = false,
  ): this {
    tmpE.set(rot[0], rot[1], rot[2]);
    tmpQ.setFromEuler(tmpE);
    if (typeof scale === 'number') tmpS.set(scale, scale, scale);
    else tmpS.set(scale[0], scale[1], scale[2]);
    tmpP.set(pos[0], pos[1], pos[2]);
    tmpM.compose(tmpP, tmpQ, tmpS);
    (shiny ? this.metal : this.parts).push({ geo, color, matrix: tmpM.clone() });
    return this;
  }

  /** igual ao add, mas brilhante (ferro, ouro) */
  metalPart(geo: THREE.BufferGeometry, color: number, pos?: [number, number, number], rot?: [number, number, number], scale?: [number, number, number] | number): this {
    return this.add(geo, color, pos, rot, scale, true);
  }

  /** funde as peças (ou pega do cache) */
  private merge(list: KitPart[], mat: string): THREE.BufferGeometry | null {
    const key = mat + '|' + list.map((p) => `${p.geo.id}:${p.color}:${p.matrix.elements.join(',')}`).join('|');
    const hit = mergedCache.get(key);
    if (hit) return hit;
    const gs: THREE.BufferGeometry[] = [];
    for (const p of list) {
      const g = p.geo.clone();
      g.applyMatrix4(p.matrix);
      const n = g.attributes.position.count;
      const cols = new Float32Array(n * 3);
      tmpC.setHex(p.color);
      for (let i = 0; i < n; i++) {
        cols[i * 3] = tmpC.r;
        cols[i * 3 + 1] = tmpC.g;
        cols[i * 3 + 2] = tmpC.b;
      }
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      gs.push(g);
    }
    const merged = mergeGeometries(gs, false);
    if (!merged) return null;
    merged.computeBoundingSphere();
    mergedCache.set(key, merged);
    return merged;
  }

  /** cria as malhas dentro de `parent` */
  bake(parent: THREE.Object3D): void {
    for (const [list, m, id] of [[this.parts, charMat, 'c'], [this.metal, metalMat, 'm']] as const) {
      if (!list.length) continue;
      const merged = this.merge(list, id);
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    this.parts = [];
    this.metal = [];
  }
}

export const group = (parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};

/** número pseudoaleatório estável a partir do id (variação visual, fora da simulação) */
export function vary(id: number, salt: number): number {
  let h = (id * 2654435761 + salt * 40503) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 2246822519) >>> 0;
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
export const pick = <T>(list: T[], r: number): T => list[Math.floor(r * list.length) % list.length];

// ───────────────────────────── esqueleto humano ─────────────────────────────

export interface Limb {
  /** ombro/quadril (gira pra frente/trás em z) */
  a: THREE.Group;
  /** cotovelo/joelho */
  b: THREE.Group;
  /** ponta (mão/pé) */
  c: THREE.Group;
}

export interface Human {
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  legL: Limb;
  legR: Limb;
  armL: Limb;
  armR: Limb;
  /** capa solta nos ombros (só os heróis: balança com a mola, v0.30) */
  cape?: THREE.Group;
  /** o que a animação lembra de um quadro pro outro (a mola da capa) */
  mem: { cape: number; capeV: number };
}

export interface HumanLook {
  skin: number;
  hair: number | null;
  beard: number | null;
  /** camisa/túnica (parte de cima) e saia da túnica */
  shirt: number;
  skirt: number;
  sleeve: number;
  pants: number;
  boot: number;
  belt: number;
  /** largura do tronco (1 = normal; herói é mais largo) */
  bulk?: number;
  /** espessura de braços/pernas */
  limb?: number;
  /** barriga */
  belly?: number;
  /** sem nariz, olhos nem sobrancelhas: o Ignavo é um vulto sem traço de rosto (world_0_vestibule.md) */
  semRosto?: boolean;
}

/** monta o corpo de um humano; os acessórios (chapéu, arma...) entram depois nos grupos */
export function buildHuman(
  body: THREE.Group,
  look: HumanLook,
  extras: {
    torso?: (k: Kit) => void;
    head?: (k: Kit) => void;
    /** capa solta (v0.30): as peças em coordenadas do tronco; gira em volta de `capePivot` (o alto das costas) */
    cape?: (k: Kit) => void;
    capePivot?: [number, number];
  } = {},
): Human {
  const bulk = look.bulk ?? 1;
  const limb = look.limb ?? 1;
  const belly = look.belly ?? 0;

  // quadril e pernas
  const hips = group(body, 0, 0.46, 0);
  const leg = (side: number): Limb => {
    const a = group(hips, 0, 0, side * 0.075 * bulk);
    new Kit()
      .add(G.capsule(0.058 * limb, 0.12), look.pants, [0, -0.1, 0])
      .bake(a);
    const b = group(a, 0, -0.21, 0);
    const c = group(b, 0, -0.2, 0);
    new Kit()
      .add(G.capsule(0.05 * limb, 0.11), look.pants, [0, -0.09, 0])
      .add(G.cyl(0.062 * limb, 0.058 * limb, 0.1, 10), look.boot, [0.005, -0.15, 0])
      .add(G.sphere(0.062 * limb, 12, 8), look.boot, [0.045, -0.2, 0], [0, 0, 0], [1.5, 0.75, 1.05])
      .add(G.cyl(0.066 * limb, 0.066 * limb, 0.025, 10), look.belt, [0.005, -0.1, 0])
      .bake(b);
    return { a, b, c };
  };
  const legL = leg(1);
  const legR = leg(-1);

  // tronco: túnica torneada (cintura fina, peito, ombros), saia, cinto
  const torso = group(body, 0, 0.46, 0);
  const tk = new Kit();
  const w = bulk;
  tk.add(
    G.lathe(`torso${w}:${belly}`, [
      [0.0, -0.02],
      [0.12 * w, -0.02],
      [(0.128 + belly) * w, 0.05],
      [(0.142 + belly * 0.6) * w, 0.12],
      [0.155 * w, 0.19],
      [0.148 * w, 0.25],
      [0.1 * w, 0.29],
      [0.05, 0.31],
      [0.0, 0.31],
    ]),
    look.shirt,
    [0, 0, 0],
    [0, 0, 0],
    [0.8, 1, 1],
  );
  tk.add(
    G.lathe(`skirt${w}`, [
      [0.128 * w, 0.03],
      [0.15 * w, -0.06],
      [0.178 * w, -0.15],
      [0.17 * w, -0.165],
      [0.0, -0.165],
    ]),
    look.skirt,
    [0, 0, 0],
    [0, 0, 0],
    [0.82, 1, 1],
  );
  tk.add(G.torus(0.128 * w, 0.02), look.belt, [0, 0.01, 0], [Math.PI / 2, 0, 0], [0.82, 1, 1]);
  tk.metalPart(G.box(0.02, 0.04, 0.05), P.gold, [0.106 * w, 0.01, 0]);
  tk.add(G.cyl(0.045, 0.05, 0.07, 10), look.skin, [0, 0.33, 0]); // pescoço
  // ombros arredondados
  tk.add(G.sphere(0.05 * limb), look.sleeve, [0, 0.25, 0.15 * w], [0, 0, 0], [1, 0.85, 1]);
  tk.add(G.sphere(0.05 * limb), look.sleeve, [0, 0.25, -0.15 * w], [0, 0, 0], [1, 0.85, 1]);
  extras.torso?.(tk);
  tk.bake(torso);
  let cape: THREE.Group | undefined;
  if (extras.cape) {
    const [px, py] = extras.capePivot ?? [-0.14, 0.27];
    cape = group(torso, px, py, 0);
    const ck = new Kit();
    extras.cape(ck);
    ck.bake(group(cape, -px, -py, 0));
  }

  // cabeça: crânio, queixo, nariz, olhos, sobrancelhas, orelhas, cabelo, barba
  const head = group(torso, 0, 0.42, 0);
  head.name = 'cabeca';
  const hk = new Kit();
  hk.add(G.sphere(0.1), look.skin, [0, 0, 0], [0, 0, 0], [0.98, 1.02, 0.95]);
  hk.add(G.sphere(0.075), look.skin, [0.025, -0.045, 0], [0, 0, 0], [1, 0.8, 1.05]);
  if (!look.semRosto) {
    hk.add(G.cone(0.022, 0.055, 8), look.skin, [0.103, -0.008, 0], [0, 0, -Math.PI / 2]);
    hk.add(G.sphere(0.013, 8, 6), P.black, [0.087, 0.018, 0.036]);
    hk.add(G.sphere(0.013, 8, 6), P.black, [0.087, 0.018, -0.036]);
    const brow = look.hair ?? 0x3b2414;
    hk.add(G.box(0.02, 0.012, 0.04), brow, [0.092, 0.042, 0.036], [0.3, 0, 0.15]);
    hk.add(G.box(0.02, 0.012, 0.04), brow, [0.092, 0.042, -0.036], [-0.3, 0, 0.15]);
  }
  hk.add(G.sphere(0.026, 8, 6), look.skin, [-0.005, 0, 0.096], [0, 0, 0], [0.7, 1.1, 0.6]);
  hk.add(G.sphere(0.026, 8, 6), look.skin, [-0.005, 0, -0.096], [0, 0, 0], [0.7, 1.1, 0.6]);
  if (look.hair !== null) hk.add(G.cap(0.106, 0.5), look.hair, [-0.012, 0.004, 0], [0, 0, 0.35]);
  if (look.beard !== null) {
    hk.add(G.sphere(0.07), look.beard, [0.06, -0.07, 0], [0, 0, 0.2], [0.7, 1, 1.15]);
    hk.add(G.box(0.03, 0.014, 0.08), look.beard, [0.1, -0.03, 0]); // bigode
  }
  extras.head?.(hk);
  hk.bake(head);

  // braços: ombro → cotovelo → mão
  const arm = (side: number): Limb => {
    const a = group(torso, 0, 0.255, side * 0.165 * w);
    a.rotation.x = -side * 0.1;
    new Kit()
      .add(G.capsule(0.043 * limb, 0.1), look.sleeve, [0, -0.07, 0])
      .bake(a);
    const b = group(a, 0, -0.155, 0);
    const c = group(b, 0, -0.145, 0);
    new Kit()
      .add(G.capsule(0.039 * limb, 0.085), look.skin, [0, -0.065, 0])
      .add(G.cyl(0.046 * limb, 0.044 * limb, 0.06, 10), look.belt, [0, -0.05, 0]) // braçadeira
      .add(G.sphere(0.042 * limb, 10, 8), look.skin, [0.005, -0.145, 0], [0, 0, 0], [1, 1.1, 0.85])
      .bake(b);
    return { a, b, c };
  };
  const armL = arm(1);
  const armR = arm(-1);
  return { body, hips, torso, head, legL, legR, armL, armR, cape, mem: { cape: 0, capeV: 0 } };
}

// ───────────────────────────── animação ─────────────────────────────

export interface AnimState {
  t: number;
  /** fase do passo */
  phase: number;
  moving: boolean;
  working: boolean;
  /** segundos desde o último ataque (grande = faz tempo) */
  since: number;
  seed: number;
  /** v0.30 (corpo vivo, `bodyMotion` no renderer): 0 = pose parado, 1 = pose andando; no meio, mistura */
  walk?: number;
  /** inclinação extra do tronco (negativo = pra frente): tranco de arrancar e frear */
  lean?: number;
  /** deitar na curva (pra dentro) */
  bank?: number;
  /** tranco de quem apanhou (1 na hora, 0 depois de ~0,3 s) */
  flinch?: number;
  /** v0.30, 2ª leva: segundos do quadro (molas), velocidade (1 = a normal da unidade) e giro (rad/s, + = esquerda) */
  dt?: number;
  spd?: number;
  turn?: number;
}

export type Style = 'tool' | 'sword' | 'bow' | 'hero';
/**
 * segundos do começo da animação do golpe até o impacto (a arma passa pela frente; o arco solta a
 * flecha). v0.30: o dano da simulação cai no passo do golpe, então o renderer começa a animação esse
 * tempo antes (pela recarga) e o impacto coincide com o dano, o número e o tranco de quem apanha
 */
export const STRIKE_AT: Record<Style, number> = { hero: 0.25, sword: 0.24, tool: 0.24, bow: 0.32 };

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (k: number) => k * k * (3 - 2 * k);

/** postura e movimento de um humano a pé */
export function animateHuman(h: Human, s: AnimState, style: Style): void {
  pose(h, s, style);
  const w = s.walk ?? (s.moving ? 1 : 0);
  const f = s.flinch ?? 0;
  const lean = s.lean ?? 0;
  const turn = s.turn ?? 0;
  const free = !s.working && s.since > 1.2; // nem golpeando nem trabalhando

  // parado com personalidade (2ª leva): de tempos em tempos um gesto
  if (free && w < 0.99) idle(h, s, style, 1 - w);
  // golpe com o corpo todo: passo à frente no golpe, amassada no impacto, recuo do arco
  const lunge = attackBody(h, s, style);

  // 1ª leva: tranco de arrancar/frear, deitar na curva, tranco de quem apanhou
  h.torso.rotation.z += lean + f * 0.45;
  h.head.rotation.z += f * 0.3 - lean * 0.4; // a cabeça segura o olhar (compensa metade da inclinação)
  h.body.position.x = -f * 0.09 + lunge;
  h.body.position.y += Math.min(0, lean) * 0.12;
  if (f > 0) h.torso.scale.set(h.torso.scale.x * (1 + f * 0.05), h.torso.scale.y * (1 - f * 0.07), h.torso.scale.z * (1 + f * 0.05));

  // movimento secundário (2ª leva): a cabeça olha pra onde vira; os braços ficam pra trás no tranco
  h.head.rotation.y += Math.max(-0.5, Math.min(0.5, turn * 0.12));
  if (free) {
    h.armL.a.rotation.z += lean * 0.7;
    h.armR.a.rotation.z += lean * 0.7;
  }
  // capa: pendurada pela gravidade (desfaz a inclinação do tronco), voa pra trás andando, com mola
  if (h.cape) {
    const m = h.mem;
    const spd = Math.min(1.4, s.spd ?? w);
    const target = -0.04 - 0.34 * w * spd - h.torso.rotation.z * 0.85 + Math.sin(s.t * 9 + s.seed) * 0.05 * w;
    for (let left = Math.min(s.dt ?? 0, 0.1); left > 0; left -= 1 / 60) {
      const st = Math.min(left, 1 / 60);
      m.capeV += ((target - m.cape) * 70 - m.capeV * 7) * st;
      m.cape += m.capeV * st;
    }
    if (!s.dt) m.cape = target;
    m.cape = Math.max(-1.1, Math.min(0.12, m.cape)); // pra frente não entra nas pernas
    h.cape.rotation.z = m.cape;
    h.cape.rotation.x = -(s.bank ?? 0) * 0.9; // na curva abre pra fora
  }
}

/** número estável de 0 a 1 por (unidade, vez) — escolhe o gesto e o lado sem guardar estado */
const pick01 = (a: number, b: number) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Gesto de quem está parado (a cada 5–8 s, ~2,4 s cada; cada unidade no seu tempo): olhar em volta,
 * trocar o peso de perna, mexer os ombros, ou o do estilo (coçar a cabeça, espada no ombro, conferir o
 * arco, o Jagger apoiando o forcado)
 */
function idle(h: Human, s: AnimState, style: Style, weight: number): void {
  const period = 5 + (s.seed % 4);
  const tt = s.t + s.seed * 1.37;
  const cyc = Math.floor(tt / period);
  const local = tt - cyc * period;
  const dur = 2.4;
  if (local >= dur) return;
  const e = ease(Math.sin((Math.PI * local) / dur) ** 0.7) * weight;
  const r = pick01(s.seed, cyc);
  const dir = pick01(s.seed + 7, cyc) < 0.5 ? 1 : -1;
  const kind = Math.floor(r * 4);
  if (kind === 0) {
    // olha em volta
    h.head.rotation.y += e * 0.9 * dir;
    h.torso.rotation.y += e * 0.22 * dir;
  } else if (kind === 1) {
    // troca o peso de perna: o corpo pende pra um lado e o outro joelho dobra
    h.body.rotation.x += e * 0.09 * dir;
    (dir > 0 ? h.legR : h.legL).b.rotation.z -= e * 0.4;
    h.head.rotation.x = e * 0.12 * -dir;
  } else if (kind === 2) {
    // mexe os ombros
    h.armL.a.rotation.z += e * 0.35 * Math.sin(local * 6);
    h.armR.a.rotation.z += e * 0.35 * Math.sin(local * 6 + 1.5);
    h.head.rotation.z += e * 0.08;
  } else if (style === 'tool') {
    // coça a cabeça
    h.armR.a.rotation.z += e * 2.3;
    h.armR.b.rotation.z += e * 1.7 + e * Math.sin(local * 18) * 0.15;
    h.head.rotation.z -= e * 0.12;
  } else if (style === 'sword') {
    // descansa a espada no ombro
    h.armR.a.rotation.z += e * 1.5;
    h.armR.b.rotation.z += e * 1.3;
    h.torso.rotation.z += e * 0.06;
  } else if (style === 'bow') {
    // ergue o arco e confere a corda
    h.armL.a.rotation.z = lerp(h.armL.a.rotation.z, 1.15, e);
    h.armL.b.rotation.z = lerp(h.armL.b.rotation.z, 0.6, e);
    h.head.rotation.z -= e * 0.25;
    h.head.rotation.y -= e * 0.3;
  } else {
    // herói: finca o forcado e se apoia nele
    h.armR.a.rotation.z += e * 0.45;
    h.torso.rotation.z -= e * 0.12;
    h.head.rotation.z += e * 0.1 * Math.sin(local * 3);
  }
}

/** corpo no golpe: devolve o quanto o corpo avança (o passo à frente) */
function attackBody(h: Human, s: AnimState, style: Style): number {
  if (s.working) return 0;
  if (style === 'bow') {
    // solta a flecha: um tranquinho pra trás
    const R = STRIKE_AT.bow;
    if (s.since < R || s.since > R + 0.4) return 0;
    const env = Math.sin((Math.PI * (s.since - R)) / 0.4);
    h.head.rotation.z += env * 0.08;
    return -env * 0.04;
  }
  const dur = style === 'hero' ? 0.5 : 0.42;
  if (s.since >= dur) return 0;
  const k = s.since / dur;
  const wind = style === 'hero' ? 0.3 : 0.25;
  if (k < wind) {
    // prepara: o peso vai pra perna de trás
    const e = ease(k / wind);
    h.legR.b.rotation.z -= e * 0.2;
    return -e * 0.03;
  }
  const env = Math.sin((Math.PI * (k - wind)) / (1 - wind));
  // golpe: a perna da frente pisa à frente, a de trás estica; amassada logo no impacto
  h.legL.a.rotation.z += env * 0.45;
  h.legR.a.rotation.z -= env * 0.3;
  h.legL.b.rotation.z -= env * 0.15;
  const impact = Math.max(0, 1 - Math.abs(s.since - STRIKE_AT[style]) / 0.05);
  if (impact > 0) h.torso.scale.y *= 1 - impact * 0.06;
  return env * 0.09;
}

function pose(h: Human, s: AnimState, style: Style): void {
  const breath = Math.sin(s.t * 2.2 + s.seed) * 0.012;
  h.torso.scale.set(1, 1 + breath, 1 + breath * 0.5);
  h.head.rotation.z = Math.sin(s.t * 1.1 + s.seed) * 0.04;
  h.head.rotation.y = Math.sin(s.t * 0.7 + s.seed * 2) * 0.12;
  h.head.rotation.x = 0;
  h.body.rotation.x = s.bank ?? 0; // deita na curva (o gesto de trocar o peso soma por cima)
  const hunch = style === 'hero' ? -0.08 : 0;

  // v0.30: pose parado e pose andando misturadas por `walk` (sair e parar sem pulo de pose)
  const w = s.walk ?? (s.moving ? 1 : 0);
  const sw = Math.sin(s.phase);
  h.legL.a.rotation.z = lerp(0.05, sw * 0.62, w);
  h.legR.a.rotation.z = lerp(-0.05, -sw * 0.62, w);
  h.legL.b.rotation.z = lerp(-0.04, -Math.max(0, Math.sin(s.phase - 1.4)) * 0.95, w);
  h.legR.b.rotation.z = lerp(-0.04, -Math.max(0, Math.sin(s.phase - 1.4 + Math.PI)) * 0.95, w);
  h.body.position.y = Math.abs(Math.cos(s.phase)) * 0.05 * w;
  h.torso.rotation.z = lerp(hunch + breath * 2, -0.15 + hunch, w);
  h.torso.rotation.y = sw * 0.14 * w;
  h.hips.rotation.y = -sw * 0.09 * w;
  h.armL.a.rotation.z = lerp(0.08 + breath * 3, -sw * 0.7, w);
  h.armL.b.rotation.z = lerp(0.25, 0.35 + Math.max(0, -sw) * 0.4, w);
  h.armR.a.rotation.z = lerp(0.15 + breath * 3, sw * 0.7, w);
  h.armR.b.rotation.z = lerp(0.45, 0.35 + Math.max(0, sw) * 0.4, w);
  // virando parado (2ª leva): passinhos no lugar em vez de girar como um peão
  const ts = Math.min(1, Math.abs(s.turn ?? 0) / 3) * (1 - w);
  if (ts > 0.01) {
    const a = Math.max(0, Math.sin(s.phase));
    const b = Math.max(0, Math.sin(s.phase + Math.PI));
    h.legL.a.rotation.z += a * 0.25 * ts;
    h.legL.b.rotation.z -= a * 0.55 * ts;
    h.legR.a.rotation.z += b * 0.25 * ts;
    h.legR.b.rotation.z -= b * 0.55 * ts;
    h.body.position.y += (a + b) * 0.015 * ts;
  }

  if (style === 'bow') {
    // arco na mão esquerda, esticado pro alvo; a direita puxa a corda até o rosto e solta em BOW_RELEASE
    // (v0.30: o renderer começa a puxar antes do tiro; antes os dois braços iam pra frente juntos)
    const R = STRIKE_AT.bow;
    const t = s.since;
    const l0 = s.moving ? h.armL.a.rotation.z : 0.45;
    const lb0 = s.moving ? h.armL.b.rotation.z : 0.5;
    const r0 = h.armR.a.rotation.z;
    const rb0 = h.armR.b.rotation.z;
    if (t < R) {
      const raise = ease(Math.min(1, t / 0.14));
      const pull = ease(Math.max(0, Math.min(1, (t - 0.06) / (R - 0.06))));
      h.armL.a.rotation.z = lerp(l0, 1.5, raise);
      h.armL.b.rotation.z = lerp(lb0, 0.05, raise);
      h.armR.a.rotation.z = lerp(r0, 1.45, raise);
      h.armR.b.rotation.z = lerp(rb0, 2.3, pull);
      h.torso.rotation.y += 0.45 * raise;
    } else if (t < R + 0.1) {
      // soltou: a mão da corda estala pra trás, o arco fica firme
      const e = ease((t - R) / 0.1);
      h.armL.a.rotation.z = 1.5;
      h.armL.b.rotation.z = 0.05;
      h.armR.a.rotation.z = lerp(1.45, 1.15, e);
      h.armR.b.rotation.z = lerp(2.3, 2.65, e);
      h.torso.rotation.y += 0.45;
    } else if (t < R + 0.5) {
      // baixa os dois braços com calma
      const k = ease((t - R - 0.1) / 0.4);
      h.armL.a.rotation.z = lerp(1.5, l0, k);
      h.armL.b.rotation.z = lerp(0.05, lb0, k);
      h.armR.a.rotation.z = lerp(1.15, r0, k);
      h.armR.b.rotation.z = lerp(2.65, rb0, k);
      h.torso.rotation.y += 0.45 * (1 - k);
    } else if (!s.moving) {
      h.armL.a.rotation.z = 0.45;
      h.armL.b.rotation.z = 0.5;
    }
    return;
  }

  if (s.working) {
    // ferramenta: ergue devagar, desce rápido (machado, picareta, martelo)
    const c = (s.t * 1.5 + s.seed) % 1;
    const up = c < 0.62;
    const k = up ? ease(c / 0.62) : (c - 0.62) / 0.38;
    h.armR.a.rotation.z = up ? lerp(0.3, 2.75, k) : lerp(2.75, 0.35, k);
    h.armR.b.rotation.z = up ? lerp(0.4, 0.15, k) : 0.35;
    h.armL.a.rotation.z = up ? lerp(0.3, 2.3, k) : lerp(2.3, 0.4, k);
    h.armL.b.rotation.z = 0.3;
    h.torso.rotation.z = up ? lerp(-0.05, 0.12, k) : lerp(0.12, -0.25, k);
    return;
  }

  if (style === 'hero') {
    // o forcado fica em pé na mão (antebraço pra frente); o golpe é uma pancada de cima que
    // termina com os dentes apontados pro inimigo
    if (s.since < 0.5) {
      const k = s.since / 0.5;
      const wind = k < 0.3;
      h.armR.a.rotation.z = wind ? lerp(0.15, 2.6, ease(k / 0.3)) : lerp(2.6, -0.25, ease((k - 0.3) / 0.7));
      h.armR.b.rotation.z = wind ? lerp(1.45, 0.4, ease(k / 0.3)) : 0.35;
      h.armL.a.rotation.z = wind ? 1.2 : 0.6;
      h.torso.rotation.y = Math.sin(k * Math.PI) * 0.4;
      h.torso.rotation.z = wind ? 0.08 + hunch : -0.22 + hunch;
    } else {
      h.armR.a.rotation.z = s.moving ? 0.25 + Math.sin(s.phase) * 0.15 : 0.15;
      h.armR.b.rotation.z = 1.45;
    }
    return;
  }

  if (s.since < 0.42) {
    // golpe: prepara atrás e desce cortando, girando o tronco
    const k = s.since / 0.42;
    const wind = k < 0.25;
    h.armR.a.rotation.z = wind ? lerp(0.6, 2.7, ease(k / 0.25)) : lerp(2.7, 0.2, ease((k - 0.25) / 0.75));
    h.armR.b.rotation.z = wind ? 0.6 : 0.2;
    h.torso.rotation.y = Math.sin(k * Math.PI) * 0.3;
    h.torso.rotation.z = wind ? 0.05 + hunch : -0.18 + hunch;
    if (style === 'sword') h.armL.a.rotation.z = 0.7; // escudo à frente
  } else if (style === 'sword' && !s.moving) {
    h.armL.a.rotation.z = 0.55; // guarda com o escudo
    h.armL.b.rotation.z = 0.9;
  }
}

export function base(): { root: THREE.Group; body: THREE.Group } {
  const root = new THREE.Group();
  const body = group(root);
  return { root, body };
}

/** grupo da mão com a ferramenta apontando pra frente-baixo */
export const grip = (hand: THREE.Group, tilt = 1.2): THREE.Group => {
  const g = group(hand);
  g.rotation.z = tilt;
  return g;
};
