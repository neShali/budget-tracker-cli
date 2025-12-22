import { v4 as uuidv4 } from 'uuid';

import type {
  IAccount,
  ITransaction,
  ISummary,
  Update,
} from '../interfaces/index.js';

import { writeFile } from 'node:fs/promises';
import { escapeCsvValue } from '../utils/index.js';

export type AccountCreateInput = {
  name: string;
  id?: string;
  createdAt?: string;
};

export type AccountCreateError =
  | 'INVALID_NAME'
  | 'INVALID_ID'
  | 'INVALID_CREATED_AT';

export class Account implements IAccount {
  private readonly _id: string;
  private _name: string;
  private readonly _createdAt: string;

  private _transactions: ITransaction[] = [];

  private constructor(props: { id: string; name: string; createdAt: string }) {
    this._id = props.id;
    this._name = props.name;
    this._createdAt = props.createdAt;
  }

  static create(
    input: AccountCreateInput
  ): { ok: true; value: Account } | { ok: false; error: AccountCreateError } {
    const id = (input.id ?? uuidv4()).trim();
    if (id.length === 0) return { ok: false, error: 'INVALID_ID' };

    const name = input.name.trim();
    if (name.length === 0) return { ok: false, error: 'INVALID_NAME' };

    const createdAt = (input.createdAt ?? todayIso()).trim();
    if (!isIsoDateTime(createdAt))
      return { ok: false, error: 'INVALID_CREATED_AT' };

    return { ok: true, value: new Account({ id, name, createdAt }) };
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    const next = value.trim();
    if (next.length === 0) return;
    this._name = next;
  }

  get createdAt(): string {
    return this._createdAt;
  }

  get transactions(): ReadonlyArray<ITransaction> {
    return this._transactions;
  }

  addTransaction(tx: ITransaction): void {
    if (tx.accountId !== this._id) return;
    this._transactions = [...this._transactions, tx].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  removeTransaction(transactionId: string): boolean {
    const before = this._transactions.length;
    this._transactions = this._transactions.filter(
      (t) => t.id !== transactionId
    );
    return this._transactions.length !== before;
  }

  getSummary(): ISummary {
    let income = 0;
    let expense = 0;

    for (const tx of this._transactions) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }

    return {
      income,
      expense,
      balance: income - expense,
      transactionsCount: this._transactions.length,
    };
  }

  getSummaryString(): string {
    const s = this.getSummary();
    return [
      `Счёт: ${this._name}`,
      `ID: ${shortId(this._id)}`,
      `Создан: ${this._createdAt.slice(0, 10)}`,
      `Баланс: ${s.balance}`,
      `Доходы: ${s.income} | Расходы: ${s.expense}`,
      `Транзакций: ${s.transactionsCount}`,
    ].join('\n');
  }

  update(patch: Update<Pick<Account, 'name'>>): void {
    if (typeof patch.name === 'string') {
      this.name = patch.name;
    }
  }

  async exportTransactionsToCSV(fileBaseName: string): Promise<string> {
    const safeBase = fileBaseName.trim();
    const name =
      safeBase.length > 0 ? safeBase : `account_${this._id.slice(0, 8)}`;
    const filename = name.endsWith('.csv') ? name : `${name}.csv`;

    const header = [
      'transaction_id',
      'account_id',
      'type',
      'amount',
      'date',
      'description',
    ];

    const rows = this._transactions.map((t) => [
      t.id,
      t.accountId,
      t.type,
      String(t.amount),
      t.date,
      t.description ?? '',
    ]);

    const csv =
      [header, ...rows]
        .map((cols) => cols.map((c) => escapeCsvValue(c)).join(','))
        .join('\n') + '\n';

    await writeFile(filename, csv, { encoding: 'utf-8' });

    return filename;
  }
}

function todayIso(): string {
  return new Date().toISOString();
}

function isIsoDateTime(value: string): boolean {
  const d = new Date(value);
  return Number.isFinite(d.getTime()) && value.includes('T');
}

function shortId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 4)}…${id.slice(-4)}`;
}
