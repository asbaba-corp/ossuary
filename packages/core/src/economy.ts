export const GOLD_RESOURCE = "gold" as const;
export const DUST_RESOURCE = "dust" as const;
export const MATERIAL_RESOURCE = "material" as const;
export const GUARDIAN_PRICE_RESOURCE = "guardian-price" as const;

export type EconomyResourceId = string;
export type EconomyScope = "account" | "run";
export type EconomyDirection = "credit" | "debit";

export interface EconomyState {
  readonly account: Readonly<Record<EconomyResourceId, number>>;
  readonly runIncome: Readonly<Record<EconomyResourceId, number>>;
  readonly runExpenses: Readonly<Record<EconomyResourceId, number>>;
}

export interface EconomyTransaction {
  readonly scope: EconomyScope;
  readonly resourceId: EconomyResourceId;
  readonly direction: EconomyDirection;
  readonly amount: number;
  readonly reason: string;
}

export interface EconomyEvent extends EconomyTransaction {
  readonly balanceAfter: number;
  readonly runBalanceAfter: number;
}

export interface EconomyTransition {
  readonly state: EconomyState;
  readonly event: EconomyEvent;
}

export interface EconomyBatchTransition {
  readonly state: EconomyState;
  readonly events: readonly EconomyEvent[];
}

export function createEconomyState(): EconomyState {
  return { account: {}, runIncome: {}, runExpenses: {} };
}

export function getAccountBalance(state: EconomyState, resourceId: EconomyResourceId): number {
  assertValidState(state);
  assertResourceId(resourceId);
  return state.account[resourceId] ?? 0;
}

export function getRunIncome(state: EconomyState, resourceId: EconomyResourceId): number {
  assertValidState(state);
  assertResourceId(resourceId);
  return state.runIncome[resourceId] ?? 0;
}

export function getRunExpenses(state: EconomyState, resourceId: EconomyResourceId): number {
  assertValidState(state);
  assertResourceId(resourceId);
  return state.runExpenses[resourceId] ?? 0;
}

export function getRunBalance(state: EconomyState, resourceId: EconomyResourceId): number {
  return getRunIncome(state, resourceId) - getRunExpenses(state, resourceId);
}

export function applyEconomyTransaction(
  state: EconomyState,
  transaction: EconomyTransaction,
): EconomyTransition {
  const result = applyTransactionUnchecked(state, transaction);
  return { state: result.state, event: result.event };
}

export function applyEconomyTransactions(
  state: EconomyState,
  transactions: readonly EconomyTransaction[],
): EconomyBatchTransition {
  assertValidState(state);
  let nextState = state;
  const events: EconomyEvent[] = [];
  for (const transaction of transactions) {
    const result = applyTransactionUnchecked(nextState, transaction);
    nextState = result.state;
    events.push(result.event);
  }
  return { state: nextState, events };
}

function applyTransactionUnchecked(
  state: EconomyState,
  transaction: EconomyTransaction,
): EconomyTransition {
  assertValidState(state);
  assertValidTransaction(transaction);

  if (transaction.scope === "account" && transaction.direction === "debit") {
    const current = state.account[transaction.resourceId] ?? 0;
    if (current < transaction.amount) {
      throw new RangeError(`saldo insuficiente: ${transaction.resourceId}`);
    }
  }

  const nextState = transaction.scope === "account"
    ? { ...state, account: updateBalance(state.account, transaction) }
    : updateRun(state, transaction);
  const event: EconomyEvent = {
    ...transaction,
    balanceAfter: transaction.scope === "account"
      ? nextState.account[transaction.resourceId] ?? 0
      : getRunBalance(nextState, transaction.resourceId),
    runBalanceAfter: getRunBalance(nextState, transaction.resourceId),
  };
  return { state: nextState, event };
}

function updateRun(state: EconomyState, transaction: EconomyTransaction): EconomyState {
  const balances = transaction.direction === "credit"
    ? { ...state.runIncome, [transaction.resourceId]: (state.runIncome[transaction.resourceId] ?? 0) + transaction.amount }
    : { ...state.runExpenses, [transaction.resourceId]: (state.runExpenses[transaction.resourceId] ?? 0) + transaction.amount };
  return transaction.direction === "credit"
    ? { ...state, runIncome: balances }
    : { ...state, runExpenses: balances };
}

function updateBalance(
  balances: Readonly<Record<EconomyResourceId, number>>,
  transaction: EconomyTransaction,
): Readonly<Record<EconomyResourceId, number>> {
  const current = balances[transaction.resourceId] ?? 0;
  const next = transaction.direction === "credit"
    ? current + transaction.amount
    : current - transaction.amount;
  return { ...balances, [transaction.resourceId]: next };
}

function assertValidState(state: EconomyState): void {
  assertBalances(state.account, "account");
  assertBalances(state.runIncome, "runIncome");
  assertBalances(state.runExpenses, "runExpenses");
}

function assertBalances(
  balances: Readonly<Record<EconomyResourceId, number>>,
  name: string,
): void {
  for (const [resourceId, amount] of Object.entries(balances)) {
    assertResourceId(resourceId);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError(`${name} inválido: ${resourceId}`);
    }
  }
}

function assertValidTransaction(transaction: EconomyTransaction): void {
  if (transaction.scope !== "account" && transaction.scope !== "run") {
    throw new RangeError(`escopo inválido: ${transaction.scope}`);
  }
  if (transaction.direction !== "credit" && transaction.direction !== "debit") {
    throw new RangeError(`direção inválida: ${transaction.direction}`);
  }
  assertResourceId(transaction.resourceId);
  if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) {
    throw new RangeError("amount deve ser positivo e finito");
  }
  if (!transaction.reason.trim()) throw new RangeError("transação precisa de motivo");
}

function assertResourceId(resourceId: string): void {
  if (!resourceId.trim()) throw new RangeError("resourceId obrigatório");
}
