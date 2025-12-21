import type { ITransaction } from './ITransaction.js';
import type { ISummary } from './ISummary.js';

export interface IAccount {
  readonly id: string;
  name: string;
  readonly createdAt: string;

  readonly transactions: ReadonlyArray<ITransaction>;

  addTransaction(tx: ITransaction): void;
  removeTransaction(transactionId: string): boolean;

  getSummary(): ISummary;
  getSummaryString(): string;
}
