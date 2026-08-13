/**
 * Regra escolhida pelo dono: auto-equipar SÓ em slot vazio.
 *
 * Os casos negativos são os mais importantes daqui. Eles travam a promessa de
 * que o jogo nunca desfaz uma escolha do jogador — se alguém trocar isso por
 * "equipar se for melhor", esta suíte quebra e a decisão volta à mesa.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { autoEquipEmptySlots, hasEmptySlot } from "../dist/auto-equip.js";
import { createRoster, createParty } from "../dist/party.js";
import { createEquipment, createCharacterLoadout, equipEquipment } from "../dist/equipment/legacy.js";
import { createInventory, addItem } from "../dist/inventory.js";

const arma = (id, reachBonus = 0) =>
  createEquipment(id, id, "weapon", {}, { instanceId: id, stats: { baseDamage: 5, reachBonus } });
const elmo = (id) => createEquipment(id, id, "helmet", {}, { instanceId: id, stats: { baseDefense: 2 } });

// o roster nasce com um personagem e a party já o inclui
const HEROI = "character-1";

function cenario({ equipado = null, itens = [] } = {}) {
  let roster = createRoster();
  const party = createParty();
  if (equipado) {
    const loadout = equipEquipment(roster.equipmentLoadouts[HEROI], equipado);
    roster = { ...roster, equipmentLoadouts: { ...roster.equipmentLoadouts, [HEROI]: loadout } };
  }
  let inventory = createInventory();
  for (const item of itens) inventory = addItem(inventory, { item, quantity: 1 });
  return { roster, party, inventory };
}

test("slot vazio recebe a peça do inventário", () => {
  const { roster, party, inventory } = cenario({ itens: [arma("foice", 1)] });
  const r = autoEquipEmptySlots(roster, party, inventory);
  assert.equal(r.roster.equipmentLoadouts[HEROI].equipped.weapon.instanceId, "foice");
  assert.equal(r.assignments.length, 1);
  assert.deepEqual(r.assignments[0], { characterId: HEROI, instanceId: "foice", slot: "weapon" });
});

test("a peça sai do inventário ao ser equipada", () => {
  const { roster, party, inventory } = cenario({ itens: [arma("foice", 1)] });
  const r = autoEquipEmptySlots(roster, party, inventory);
  assert.equal(r.inventory.items.length, 0);
});

/* O caso que define a regra. */
test("slot ocupado NUNCA é substituído, mesmo por peça melhor", () => {
  const { roster, party, inventory } = cenario({
    equipado: arma("lamina-cega", 0),
    itens: [arma("ceifa-lendaria", 2)],
  });
  const r = autoEquipEmptySlots(roster, party, inventory);
  assert.equal(r.roster.equipmentLoadouts[HEROI].equipped.weapon.instanceId, "lamina-cega");
  assert.equal(r.assignments.length, 0);
  assert.equal(r.inventory.items.length, 1, "a peça melhor continua na mochila");
});

test("preenche vários slots vazios de uma vez", () => {
  const { roster, party, inventory } = cenario({ itens: [arma("foice"), elmo("crânio")] });
  const r = autoEquipEmptySlots(roster, party, inventory);
  const equipado = r.roster.equipmentLoadouts[HEROI].equipped;
  assert.equal(equipado.weapon.instanceId, "foice");
  assert.equal(equipado.helmet.instanceId, "crânio");
  assert.equal(r.assignments.length, 2);
});

test("só um item por slot, o restante fica na mochila", () => {
  const { roster, party, inventory } = cenario({ itens: [arma("primeira"), arma("segunda")] });
  const r = autoEquipEmptySlots(roster, party, inventory);
  assert.equal(r.roster.equipmentLoadouts[HEROI].equipped.weapon.instanceId, "primeira");
  assert.equal(r.inventory.items.length, 1);
  assert.equal(r.inventory.items[0].item.instanceId, "segunda");
});

test("inventário vazio não muda nada", () => {
  const { roster, party, inventory } = cenario();
  const r = autoEquipEmptySlots(roster, party, inventory);
  assert.equal(r.assignments.length, 0);
  assert.equal(r.roster, roster, "o roster deve ser o mesmo objeto quando nada muda");
});

test("consumível não é equipado", () => {
  const { roster, party } = cenario();
  const inventory = addItem(createInventory(), {
    item: { kind: "consumable", id: "pocao", name: "Poção", rarity: "common", effects: [] },
    quantity: 3,
  });
  const r = autoEquipEmptySlots(roster, party, inventory);
  assert.equal(r.assignments.length, 0);
  assert.equal(r.inventory.items.length, 1);
});

test("é determinístico", () => {
  const montar = () => cenario({ itens: [arma("a"), elmo("b"), arma("c")] });
  const um = autoEquipEmptySlots(...Object.values(montar()));
  const dois = autoEquipEmptySlots(...Object.values(montar()));
  assert.deepEqual(um.assignments, dois.assignments);
});

test("hasEmptySlot responde pelo loadout", () => {
  const vazio = createCharacterLoadout(HEROI);
  assert.equal(hasEmptySlot(vazio), true);
  assert.equal(hasEmptySlot(equipEquipment(vazio, arma("foice"))), true, "ainda há outros slots");
});
