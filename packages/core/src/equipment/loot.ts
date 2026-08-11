import { createEquipmentFromDropTable } from "./legacy.js";
import type {
  Equipment,
  EquipmentDropEntry,
} from "./legacy.js";

/** Gera uma única peça a partir de uma tabela fornecida pelo chamador. */
export function generateEquipmentDrop(
  instanceId: string,
  seed: number | string,
  table: readonly EquipmentDropEntry[],
): Equipment {
  return createEquipmentFromDropTable(instanceId, seed, table);
}
