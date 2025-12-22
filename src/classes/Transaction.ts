import { v4 as uuidv4 } from 'uuid';

import type {
  ITransaction,
  Result,
  TransactionType,
} from '../interfaces/index.js';

export type TransactionCreateInput = {
  accountId: string;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
  id?: string;
};

export type TransactionCreateError =
  | 'INVALID_ACCOUNT_ID'
  | 'INVALID_AMOUNT'
  | 'INVALID_DATE'
  | 'INVALID_ID';

export class Transaction implements ITransaction {
  private readonly _id: string;
  private readonly _accountId: string;
  private readonly _amount: number;
  private readonly _type: TransactionType;
  private readonly _date: string;
  private readonly _description: string;

  private constructor(props: {
    id: string;
    accountId: string;
    amount: number;
    type: TransactionType;
    date: string;
    description: string;
  }) {
    this._id = props.id;
    this._accountId = props.accountId;
    this._amount = props.amount;
    this._type = props.type;
    this._date = props.date;
    this._description = props.description;
  }

  static create(
    input: TransactionCreateInput
  ): Result<Transaction, TransactionCreateError> {
    const id = (input.id ?? uuidv4()).trim();
    if (id.length === 0) return { ok: false, error: 'INVALID_ID' };

    const accountId = input.accountId.trim();
    if (accountId.length === 0)
      return { ok: false, error: 'INVALID_ACCOUNT_ID' };

    const amount = input.amount;
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'INVALID_AMOUNT' };
    }

    const dateRes = normalizeDate(input.date);
    if (!dateRes.ok) return { ok: false, error: 'INVALID_DATE' };

    const description = input.description.trim();

    return {
      ok: true,
      value: new Transaction({
        id,
        accountId,
        amount,
        type: input.type,
        date: dateRes.value,
        description,
      }),
    };
  }

  get id(): string {
    return this._id;
  }

  get accountId(): string {
    return this._accountId;
  }

  get amount(): number {
    return this._amount;
  }

  get type(): TransactionType {
    return this._type;
  }

  get date(): string {
    return this._date;
  }

  get description(): string {
    return this._description;
  }

  toString(): string {
    const sign = this._type === 'income' ? '+' : '-';
    const desc = this._description.length > 0 ? ` — ${this._description}` : '';
    return `${this._date} | ${sign}${this._amount}${desc}`;
  }
}

type DateResult = Result<string, 'INVALID_DATE'>;

function normalizeDate(input: string): DateResult {
  const raw = input.trim();

  if (raw.length === 0) {
    return { ok: true, value: todayYmd() };
  }

  if (isYmd(raw)) {
    return isValidYmd(raw)
      ? { ok: true, value: raw }
      : { ok: false, error: 'INVALID_DATE' };
  }

  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) {
    return { ok: false, error: 'INVALID_DATE' };
  }

  return { ok: true, value: d.toISOString().slice(0, 10) };
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidYmd(value: string): boolean {
  const [ys, ms, ds] = value.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);

  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d))
    return false;
  if (m < 1 || m > 12) return false;

  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= daysInMonth;
}
