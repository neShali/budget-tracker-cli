import type {
  IAccount,
  IAccountManager,
  Result,
  Update,
} from '../interfaces/index.js';

export type AccountManagerError =
  | 'ACCOUNT_ALREADY_EXISTS'
  | 'ACCOUNT_NOT_FOUND'
  | 'INVALID_NAME';

export class AccountManager implements IAccountManager {
  private readonly accounts = new Map<string, IAccount>();

  addAccount(account: IAccount): void {
    this.accounts.set(account.id, account);
  }

  addAccountSafe(account: IAccount): Result<void, 'ACCOUNT_ALREADY_EXISTS'> {
    if (this.accounts.has(account.id)) {
      return { ok: false, error: 'ACCOUNT_ALREADY_EXISTS' };
    }
    this.accounts.set(account.id, account);
    return { ok: true, value: undefined };
  }

  getAccountById(accountId: string): IAccount | undefined {
    return this.accounts.get(accountId);
  }

  listAccounts(): ReadonlyArray<IAccount> {
    return Array.from(this.accounts.values());
  }

  removeAccount(accountId: string): boolean {
    return this.accounts.delete(accountId);
  }

  renameAccount(
    accountId: string,
    patch: Update<Pick<IAccount, 'name'>>
  ): Result<IAccount, AccountManagerError> {
    const account = this.accounts.get(accountId);
    if (!account) return { ok: false, error: 'ACCOUNT_NOT_FOUND' };

    const nextName = patch.name?.trim();
    if (!nextName) return { ok: false, error: 'INVALID_NAME' };

    account.name = nextName;
    return { ok: true, value: account };
  }
}
