import type { IAccount } from './IAccount.js';

export interface IAccountManager {
  addAccount(account: IAccount): void;

  getAccountById(accountId: string): IAccount | undefined;
  listAccounts(): ReadonlyArray<IAccount>;

  removeAccount(accountId: string): boolean;
}
