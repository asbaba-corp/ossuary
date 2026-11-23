import type { SceneAnimation, SceneAnimationState } from "./GameViewModel";

/* Layout da horda e tempos dos sinais, em unidades do palco 2D (960×384).
   Vive fora dos renderers porque os dois — Skia e 3D — precisam pôr cada
   bicho no MESMO lugar na mesma hora: é o motor que decide quando a luta
   começa, e a cena só pode acompanhar. Duplicar isto foi descartado: dois
   renderers com contas próprias divergem no primeiro ajuste. */

export const W = 960;
export const VAO_ENTRE_MOBS = 46;       // vão entre vizinhos da MESMA fileira
export const POR_FILEIRA = 4;           // quantos cabem lado a lado antes de empilhar atrás
export const RECUO_DA_FILEIRA = 26;     // cada fileira atrás fica um pouco mais longe
export const PROFUNDIDADE_DA_FILEIRA = 9;
export const PRIMEIRO_MOB_X = 334;      // encostado no herói de verdade, dentro do alcance do golpe
export const HEROI_X = 250;
/* A horda entra de FORA do palco (960 de largura): o primeiro mob começa em
   372+660=1032, além da borda direita. Com 300 ela nascia em 672, dentro do
   quadro — a onda seguinte aparecia do nada no meio da cena. */
export const ENTRADA_DA_HORDA = 660;
/* A horda só entra depois da metade da marcha. Antes dela o corredor corre
   vazio, com os corpos da onda passada ficando para trás — é o trecho de
   caminhada que dá o ar de cenário sem fim. */
export const INICIO_DA_ENTRADA = 0.5;
/* Corpo sai da lista quando já passou bem da borda esquerda. */
export const LIMITE_DO_CORPO = -160;

/** Perfil de cada inimigo: ritmo de caminhada e lugar na horda.

    Ignavo é gente, e gente não anda toda no mesmo passo nem em fila indiana.
    O perfil sai de um hash do id, então é sempre o mesmo para o mesmo bicho —
    sortear a cada quadro faria a horda tremer.

    `ritmo` 1 é o passo mais rápido, que era o de todos antes; abaixo disso o
    bicho fica para trás durante a aproximação e chega junto no fim, porque é o
    motor que decide quando a luta começa. `desvioX` e `profundidade` tiram a
    horda da linha reta: eles se amontoam com alguma folga, uns meio passo à
    frente dos outros. */
export function perfilDoMob(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  const a = ((h >>> 0) % 1000) / 1000;
  const b = ((h >>> 11) % 1000) / 1000;
  const c = ((h >>> 21) % 1000) / 1000;
  return {
    ritmo: 0.55 + a * 0.45,
    desvioX: (b - 0.5) * 30,
    profundidade: (c - 0.5) * 16,   // desloca o pé: dá amontoado com profundidade
  };
}

export const DURACAO_SINAL: Record<SceneAnimation, number> = { attack: 0.42, hurt: 0.3, dead: 0.5 };
/* O corpo ficava só por conta do scroll para sumir — sem marcha (combate,
   Loop numa mesma noite) ele nunca saía de cena, e as ondas foram ficando
   maiores (fileiras, #54), então os corpos empilhavam e pesavam o quadro.
   Agora ele para visível um instante (dá tempo do jogador registrar a
   queda) e desvanece sozinho, sem depender de a câmera andar. */
export const ATRASO_CORPO = 1.4;                // segundos parado antes de começar a sumir
export const FADE_CORPO = 0.4;                  // desvanecer depois da animação de morte
export const VIDA_NUMERO = 0.7;                 // quanto um número flutuante dura
export const VIDA_CLARAO = 0.32;                // quanto o pisca de acerto dura
/* Quanto a barra de um inimigo fica visível depois do último golpe. Longa o
   bastante para acompanhar a vida descendo, curta o bastante para a horda
   voltar a ser silhueta quando ninguém está apanhando. */
export const VIDA_BARRA_MOB = 2.2;
export const VIDA_CUSPE = 0.45;                 // quanto uma cuspida leva para cruzar

/* A horda ocupa fileiras, não uma fila.
   Com dezoito bichos, `i * vão` esticava a onda por mais de uma tela e
   virava desfile. Agora quatro brigam lado a lado e o resto se empilha
   atrás, cada fileira um pouco mais recuada e mais funda — que é como uma
   multidão de fato se comporta contra um alvo só. */
export const fileiraDe = (i: number) => Math.floor(i / POR_FILEIRA);
/** Onde um inimigo PARA para lutar. Sem o recuo de entrada. */
export const slotMob = (i: number) =>
  PRIMEIRO_MOB_X + (i % POR_FILEIRA) * VAO_ENTRE_MOBS + fileiraDe(i) * RECUO_DA_FILEIRA;

/** Quanto da entrada da horda já aconteceu (0 a 1), a partir da marcha do motor.
    Aproximação LINEAR: um morto-vivo não acelera nem desacelera — anda. */
export function aproximacao(marcha: number) {
  const bruto = Math.min(1, Math.max(0, marcha));
  return bruto <= INICIO_DA_ENTRADA ? 0 : (bruto - INICIO_DA_ENTRADA) / (1 - INICIO_DA_ENTRADA);
}

/** Onde um inimigo VIVO está agora: o passo dele mais o desvio na horda.
    `suave ** (1/ritmo)` deixa o mais lento para trás no meio do caminho e o
    traz junto no fim. */
export function posicaoMob(i: number, id: string | undefined, suave: number) {
  const perfil = id ? perfilDoMob(id) : { ritmo: 1, desvioX: 0, profundidade: 0 };
  const andado = suave <= 0 ? 0 : suave ** (1 / perfil.ritmo);
  return slotMob(i) + perfil.desvioX + (1 - andado) * ENTRADA_DA_HORDA;
}

/** O sinal de animação de `id`, enquanto ainda está tocando. */
export function sinalVivo(animations: SceneAnimationState, time: number, id?: string) {
  const s = id ? animations[id] : undefined;
  return s && time - s.epoch < DURACAO_SINAL[s.animation] ? s : undefined;
}

export type Enemy = { readonly id: string; readonly name: string; readonly hp: number; readonly maxHp: number };
export type Feedback = { readonly id: string; readonly alvo: string; readonly epoch: number; readonly text: string; readonly color: string; readonly dx?: number; readonly dy?: number };
export type Corpse = { readonly id: string; readonly combatantId: string; readonly indice: number; readonly epoch: number; readonly camera: number };

/** O contrato de qualquer renderer da cena. */
export interface SceneProps {
  time: number; status: string; enemies: readonly Enemy[]; marcha?: number; camera?: number;
  corpses?: readonly Corpse[];
  animations: SceneAnimationState; hits?: Readonly<Record<string, number>>;
  partyId?: string; partyName?: string;
  partyVitals?: { readonly hp: number; readonly maxHp: number; readonly mana: number; readonly maxMana: number };
  feedback: readonly Feedback[];
}
