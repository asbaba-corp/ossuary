/** Pequeno gerador determinístico para regras do core. */
export function deterministicIndex(seed: number | string, length: number, salt = ""): number {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError("random list length must be a positive integer");
  }

  let hash = 2166136261;
  for (const character of `${seed}:${salt}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  hash += hash << 13;
  hash ^= hash >>> 7;
  hash += hash << 3;
  hash ^= hash >>> 17;
  hash += hash << 5;
  return (hash >>> 0) % length;
}
