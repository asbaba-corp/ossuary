import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* O Vestíbulo em 3D: um corredor de ossuário que corre para a esquerda.

   O herói não anda — o mundo é que passa (mesma regra da cena 2D). Tudo aqui é
   periódico em `TRECHO` unidades: o corredor é montado em cópias de um trecho e
   transladado por `camera % TRECHO`, então nunca acaba e nunca cria nada novo.

   Custo, que foi o que travou a versão Skia (memory.md, "parede de 10 mil nós"):
   a parede inteira são DUAS malhas instanciadas (crânios e ossos), o chão uma,
   as poças uma. Três luzes pontuais no máximo, sem sombra projetada e sem
   pós-processamento — o Klongor mediu 3–4 ms por quadro só para o composer
   existir. As sombras dos bonecos são discos (bonecos.ts). */

export const TRECHO = 6;            // distância entre colunas; o período de tudo
/* Quatro cópias cobrem o quadro inteiro em qualquer deslocamento (0 a TRECHO).
   Seis eram ~500 mil triângulos, quase todos de crânio que ninguém via. */
const COPIAS = [-1, 0, 1, 2];
const PAREDE_Z = -2.7;
const ALTURA = 3.4;

/** Números pseudoaleatórios estáveis: o corredor é sempre o mesmo. */
function semente(n: number) {
  let s = n >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpC = new THREE.Color();

function compoe(x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy = sx, sz = sx) {
  tmpE.set(rx, ry, rz);
  tmpQ.setFromEuler(tmpE);
  tmpP.set(x, y, z);
  tmpS.set(sx, sy, sz);
  return tmpM.compose(tmpP, tmpQ, tmpS);
}

/** Geometria de um crânio, com cor por vértice: calota, maxilar e as órbitas. */
function geometriaDoCranio() {
  const pinta = (g: THREE.BufferGeometry, cor: number) => {
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    tmpC.setHex(cor);
    for (let i = 0; i < n; i += 1) { c[i * 3] = tmpC.r; c[i * 3 + 1] = tmpC.g; c[i * 3 + 2] = tmpC.b; }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    g.deleteAttribute("uv");
    return g;
  };
  const calota = pinta(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 0.95, 0.9), 0xffffff);
  const maxilar = pinta(new THREE.BoxGeometry(0.11, 0.06, 0.07).translate(0, -0.085, 0.035), 0xe8e0cc);
  const orbitaE = pinta(new THREE.SphereGeometry(0.028, 6, 5).translate(-0.037, -0.005, 0.082), 0x050302);
  const orbitaD = pinta(new THREE.SphereGeometry(0.028, 6, 5).translate(0.037, -0.005, 0.082), 0x050302);
  const nariz = pinta(new THREE.ConeGeometry(0.014, 0.03, 3).rotateX(Math.PI).translate(0, -0.04, 0.09), 0x050302);
  return mergeGeometries([calota, maxilar, orbitaE, orbitaD, nariz].map((g) => g.toNonIndexed()))!;
}

export interface Vestibulo {
  raiz: THREE.Group;
  /** `camera` em unidades do mundo; `t` em segundos da cena */
  atualiza(camera: number, t: number, foco: number): void;
}

export function montaVestibulo(): Vestibulo {
  const raiz = new THREE.Group();
  const mundo = new THREE.Group();          // o que corre com a câmera
  raiz.add(mundo);

  /* -------------------------------------------------------- parede de ossos */
  const r = semente(7);
  const cranios: THREE.Matrix4[] = [];
  const tons: THREE.Color[] = [];
  const ossos: THREE.Matrix4[] = [];
  const PASSO = 0.2;
  for (let fila = 0; fila < 14; fila += 1) {
    const y = 0.25 + fila * 0.215;
    const desloc = fila % 2 ? PASSO / 2 : 0;
    // entre camadas de crânios, uma camada de fêmures deitados
    if (fila % 3 === 2) {
      for (let x = 0; x < TRECHO; x += 0.36) {
        ossos.push(compoe(x + r() * 0.05, y, PAREDE_Z + 0.02, 0, 0, Math.PI / 2 + (r() - 0.5) * 0.12, 1).clone());
      }
      continue;
    }
    for (let x = 0; x < TRECHO - 0.01; x += PASSO) {
      const s = 0.85 + r() * 0.35;
      cranios.push(compoe(x + desloc + (r() - 0.5) * 0.03, y + (r() - 0.5) * 0.03, PAREDE_Z + r() * 0.04,
        (r() - 0.5) * 0.3, (r() - 0.5) * 0.6, (r() - 0.5) * 0.25, s).clone());
      const v = 0.28 + r() * 0.26;   // a parede é pano de fundo: clara demais, ela come os bonecos
      tons.push(new THREE.Color(0xb8a888).multiplyScalar(v));
    }
  }
  const matOsso = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
  const geoCranio = geometriaDoCranio();
  const instCranio = new THREE.InstancedMesh(geoCranio, matOsso, cranios.length * COPIAS.length);
  const geoOsso = new THREE.CapsuleGeometry(0.035, 0.28, 3, 6);
  const matFemur = new THREE.MeshStandardMaterial({ color: 0x8a7d62, roughness: 0.9, flatShading: true });
  const instOsso = new THREE.InstancedMesh(geoOsso, matFemur, ossos.length * COPIAS.length);
  let k = 0;
  let j = 0;
  for (const c of COPIAS) {
    const desloca = new THREE.Matrix4().makeTranslation(c * TRECHO, 0, 0);
    cranios.forEach((m, i) => {
      instCranio.setMatrixAt(k, desloca.clone().multiply(m));
      instCranio.setColorAt(k, tons[i]);
      k += 1;
    });
    for (const m of ossos) instOsso.setMatrixAt(j++, desloca.clone().multiply(m));
  }
  mundo.add(instCranio, instOsso);

  // o que fica atrás dos crânios: pedra quase preta
  const fundo = new THREE.Mesh(
    new THREE.PlaneGeometry(TRECHO * COPIAS.length, ALTURA + 1),
    new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: 1 }),
  );
  fundo.position.set(TRECHO * 0.5, ALTURA / 2, PAREDE_Z - 0.12);
  raiz.add(fundo);

  /* --------------------------------------------------------------- chão */
  const lajes: THREE.Matrix4[] = [];
  const tonsLaje: THREE.Color[] = [];
  const rl = semente(21);
  const LAJE = 0.62;
  for (let x = 0; x < TRECHO - 0.01; x += LAJE) {
    for (let z = PAREDE_Z + 0.15; z < 2.6; z += LAJE) {
      lajes.push(compoe(x + LAJE / 2, -0.04 + rl() * 0.02, z + LAJE / 2, (rl() - 0.5) * 0.03, 0, (rl() - 0.5) * 0.03, 1).clone());
      tonsLaje.push(new THREE.Color(0x2a221d).multiplyScalar(0.7 + rl() * 0.5));
    }
  }
  const geoLaje = new THREE.BoxGeometry(LAJE * 0.95, 0.08, LAJE * 0.95);
  const matLaje = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0.02 });
  const instLaje = new THREE.InstancedMesh(geoLaje, matLaje, lajes.length * COPIAS.length);
  k = 0;
  for (const c of COPIAS) {
    const desloca = new THREE.Matrix4().makeTranslation(c * TRECHO, 0, 0);
    lajes.forEach((m, i) => {
      instLaje.setMatrixAt(k, desloca.clone().multiply(m));
      instLaje.setColorAt(k, tonsLaje[i]);
      k += 1;
    });
  }
  mundo.add(instLaje);
  // a junta entre as lajes
  const junta = new THREE.Mesh(new THREE.PlaneGeometry(TRECHO * COPIAS.length, 6).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x070504, roughness: 1 }));
  junta.position.set(TRECHO * 0.5, -0.05, 0);
  raiz.add(junta);

  // sangue velho no chão, molhado o bastante para pegar o brilho das tochas
  const rp = semente(33);
  const pocas: THREE.Matrix4[] = [];
  for (let i = 0; i < 5; i += 1) {
    pocas.push(compoe(rp() * TRECHO, 0.005, PAREDE_Z + 0.6 + rp() * 3.2, 0, rp() * 6, 0, 0.3 + rp() * 0.6, 1, 0.2 + rp() * 0.4).clone());
  }
  const instPoca = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2),
    /* Sem metal: sem mapa de ambiente para refletir, metal vira buraco preto. */
    new THREE.MeshStandardMaterial({ color: 0x4a0707, roughness: 0.3, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 }),
    pocas.length * COPIAS.length,
  );
  k = 0;
  for (const c of COPIAS) {
    const desloca = new THREE.Matrix4().makeTranslation(c * TRECHO, 0, 0);
    for (const m of pocas) instPoca.setMatrixAt(k++, desloca.clone().multiply(m));
  }
  mundo.add(instPoca);

  /* --------------------------------------------------- colunas e tochas */
  const matPedra = new THREE.MeshStandardMaterial({ color: 0x2f2620, roughness: 0.95, flatShading: true });
  const matFerro = new THREE.MeshStandardMaterial({ color: 0x1c1a18, roughness: 0.5, metalness: 0.6 });
  const matChama = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const matHalo = new THREE.MeshBasicMaterial({ color: 0xff5010, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const chamas: THREE.Mesh[] = [];
  const coluna = () => {
    const g = new THREE.Group();
    const fuste = new THREE.Mesh(new THREE.BoxGeometry(0.5, ALTURA, 0.45), matPedra);
    fuste.position.y = ALTURA / 2;
    const capitel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.6), matPedra);
    capitel.position.y = ALTURA - 0.25;
    const pe = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.6), matPedra);
    pe.position.y = 0.12;
    // crânio de ornamento cravado na pedra
    const cranio = new THREE.Mesh(geoCranio, matOsso);
    cranio.position.set(0, ALTURA - 0.55, 0.25);
    cranio.scale.setScalar(1.5);
    // suporte e chama
    const suporte = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.3, 6), matFerro);
    suporte.position.set(0, 1.75, 0.33);
    suporte.rotation.x = 0.5;
    const chama = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 7), matChama);
    chama.position.set(0, 2.0, 0.42);
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), matHalo);
    halo.position.copy(chama.position);
    chamas.push(chama);
    g.add(fuste, capitel, pe, cranio, suporte, chama, halo);
    g.position.z = PAREDE_Z + 0.25;
    return g;
  };
  for (const c of COPIAS) {
    const g = coluna();
    g.position.x = c * TRECHO;
    mundo.add(g);
  }

  // teto: pedra baixa e as nervuras dos arcos
  const teto = new THREE.Mesh(new THREE.BoxGeometry(TRECHO * COPIAS.length, 0.3, 6), matPedra);
  teto.position.set(TRECHO * 0.5, ALTURA + 0.15, 0);
  raiz.add(teto);

  /* As tochas acendem com luz de verdade, mas no máximo três luzes, sempre as
     mesmas: trocar a contagem de luzes recompila todos os shaders. Elas saltam
     para as colunas mais perto do centro do quadro a cada atualização. */
  const luzes = [0, 1, 2].map(() => {
    const l = new THREE.PointLight(0xff8a3a, 6, 7.5, 1.6);
    raiz.add(l);
    return l;
  });

  /* ------------------------------------------------------------- brasas */
  const N = 90;
  const rb = semente(55);
  const base = new Float32Array(N * 4);
  for (let i = 0; i < N; i += 1) {
    base[i * 4] = rb() * TRECHO * 2.5 - 3;
    base[i * 4 + 1] = rb() * ALTURA;
    base[i * 4 + 2] = PAREDE_Z + 0.4 + rb() * 4;
    base[i * 4 + 3] = 0.15 + rb() * 0.35;    // velocidade de subida
  }
  const pos = new Float32Array(N * 3);
  const geoBrasa = new THREE.BufferGeometry();
  geoBrasa.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const brasas = new THREE.Points(geoBrasa, new THREE.PointsMaterial({
    color: 0xff6a20, size: 0.045, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  brasas.frustumCulled = false;
  raiz.add(brasas);

  return {
    raiz,
    atualiza(camera, t, foco) {
      const desloc = camera % TRECHO;
      mundo.position.x = -desloc;

      // tochas: chama tremendo e luz seguindo as três colunas mais perto do foco
      const primeira = Math.ceil((foco - TRECHO * 1.5 + desloc) / TRECHO);
      luzes.forEach((l, i) => {
        const col = primeira + i;
        const tremor = 0.82 + 0.12 * Math.sin(t * 13 + col * 2.1) + 0.06 * Math.sin(t * 31 + col);
        l.position.set(col * TRECHO - desloc, 2.0, PAREDE_Z + 0.85);
        l.intensity = 6 * tremor;
      });
      chamas.forEach((c, i) => {
        c.scale.set(1, 0.85 + 0.25 * Math.abs(Math.sin(t * 9 + i * 1.7)), 1);
      });

      // brasas sobem devagar, ondulando, e voltam pelo chão
      const larg = TRECHO * 2.5;
      for (let i = 0; i < N; i += 1) {
        const y = (base[i * 4 + 1] + t * base[i * 4 + 3]) % ALTURA;
        let x = (base[i * 4] - camera * 0.9 + Math.sin(t * 0.8 + i) * 0.2) % larg;
        if (x < 0) x += larg;
        pos[i * 3] = x - 3;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = base[i * 4 + 2] + Math.sin(t * 0.6 + i * 3) * 0.15;
      }
      geoBrasa.attributes.position.needsUpdate = true;
    },
  };
}
