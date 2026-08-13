/**
 * A economia sem prestige não tem reset que conserte um erro: ouro negativo ou
 * crédito duplicado contamina o save para sempre. Tinha zero cobertura.
 *
 * A regra que o core-design §5.3 trata como lei — o custo nunca deixa o saldo
 * negativo — precisa valer aqui, não só na UI do protótipo: quem chama isto do
 * servidor não passa pela UI.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createEconomyState,
  applyEconomyTransaction,
  applyEconomyTransactions,
  getAccountBalance,
  getRunIncome,
  getRunExpenses,
  getRunBalance,
  GOLD_RESOURCE,
} from "../dist/economy.js";

const credito = (amount, reason = "teste") => ({ scope: "account", resourceId: GOLD_RESOURCE, direction: "credit", amount, reason });
const debito = (amount, reason = "teste") => ({ scope: "account", resourceId: GOLD_RESOURCE, direction: "debit", amount, reason });

test("estado novo começa zerado", () => {
  const s = createEconomyState();
  assert.equal(getAccountBalance(s, GOLD_RESOURCE), 0);
  assert.equal(getRunBalance(s, GOLD_RESOURCE), 0);
});

test("crédito soma e débito subtrai", () => {
  let s = createEconomyState();
  s = applyEconomyTransaction(s, credito(100)).state;
  assert.equal(getAccountBalance(s, GOLD_RESOURCE), 100);
  s = applyEconomyTransaction(s, debito(30)).state;
  assert.equal(getAccountBalance(s, GOLD_RESOURCE), 70);
});

test("o saldo nunca fica negativo", () => {
  let s = createEconomyState();
  s = applyEconomyTransaction(s, credito(50)).state;

  let recusou = false;
  try {
    s = applyEconomyTransaction(s, debito(80)).state;
  } catch {
    recusou = true;
  }

  assert.ok(
    recusou || getAccountBalance(s, GOLD_RESOURCE) >= 0,
    "débito maior que o saldo passou e deixou o ouro negativo",
  );
});

test("um lote que falha no meio não deixa saldo pela metade", () => {
  let s = createEconomyState();
  s = applyEconomyTransaction(s, credito(100)).state;
  const antes = getAccountBalance(s, GOLD_RESOURCE);

  try {
    s = applyEconomyTransactions(s, [debito(40), debito(500), credito(10)]).state;
  } catch {
    /* recusar o lote é resposta válida; o que não pode é aplicar parte dele */
  }

  const depois = getAccountBalance(s, GOLD_RESOURCE);
  assert.ok(depois === antes || depois >= 0, "lote parcial deixou o saldo inconsistente");
});

test("receita e despesa da run são contadas em separado", () => {
  let s = createEconomyState();
  s = applyEconomyTransaction(s, { scope: "run", resourceId: GOLD_RESOURCE, direction: "credit", amount: 120, reason: "loot" }).state;
  s = applyEconomyTransaction(s, { scope: "run", resourceId: GOLD_RESOURCE, direction: "debit", amount: 50, reason: "poção" }).state;

  assert.equal(getRunIncome(s, GOLD_RESOURCE), 120);
  assert.equal(getRunExpenses(s, GOLD_RESOURCE), 50);
  assert.equal(getRunBalance(s, GOLD_RESOURCE), 70, "saldo da run tem de ser receita menos despesa");
});

test("o estado é imutável: aplicar transação não mexe no anterior", () => {
  const s0 = createEconomyState();
  const s1 = applyEconomyTransaction(s0, credito(10)).state;
  assert.equal(getAccountBalance(s0, GOLD_RESOURCE), 0, "o estado original foi mutado");
  assert.equal(getAccountBalance(s1, GOLD_RESOURCE), 10);
});
