import inquirer from 'inquirer';

import type { TransactionType } from '../interfaces/index.js';
import { Account, AccountManager, Transaction } from './index.js';

type MenuAction =
  | 'openAccount'
  | 'createAccount'
  | 'exit'
  | 'back'
  | 'addTx'
  | 'removeTx'
  | 'exportCsv'
  | 'removeAccount';

export class ApplicationController {
  public readonly accountManager: AccountManager;

  public constructor() {
    this.accountManager = new AccountManager();
  }

  public async start(): Promise<void> {
    seedInitialState(this);

    // основной цикл
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const selected = await this.showMainMenu();
      if (selected.action === 'exit') {
        console.clear();
        process.exit(0);
      }

      if (selected.action === 'createAccount') {
        await this.createAccount();
        continue;
      }

      if (selected.action === 'openAccount') {
        await this.watchAccount(selected.accountId);
        continue;
      }
    }
  }

  private async showMainMenu(): Promise<
    | { action: 'exit' }
    | { action: 'createAccount' }
    | { action: 'openAccount'; accountId: string }
  > {
    console.clear();

    const accounts = this.accountManager.listAccounts();

    const choices: Array<{
      name: string;
      value: { action: MenuAction; accountId?: string };
    }> = accounts.map((a) => {
      const s = a.getSummary();
      return {
        name: `${a.name} | баланс: ${s.balance} | транзакций: ${s.transactionsCount}`,
        value: { action: 'openAccount', accountId: a.id },
      };
    });

    choices.push({
      name: '➕ Создать новый счёт',
      value: { action: 'createAccount' },
    });
    choices.push({ name: '🚪 Выход', value: { action: 'exit' } });

    const { pick } = await inquirer.prompt<{
      pick: { action: MenuAction; accountId?: string };
    }>([
      {
        type: 'list',
        name: 'pick',
        message: 'Главное меню — выбери счёт или действие',
        choices,
        pageSize: 12,
      },
    ]);

    if (pick.action === 'exit') return { action: 'exit' };
    if (pick.action === 'createAccount') return { action: 'createAccount' };
    return { action: 'openAccount', accountId: pick.accountId ?? '' };
  }

  public async createAccount(): Promise<void> {
    console.clear();

    const { name } = await inquirer.prompt<{ name: string }>([
      {
        type: 'input',
        name: 'name',
        message: 'Название нового счёта:',
        validate: (v: string) =>
          v.trim().length > 0 ? true : 'Название не должно быть пустым',
      },
    ]);

    const created = Account.create({ name });
    if (!created.ok) {
      await this.pause(`Не удалось создать счёт: ${created.error}`);
      return;
    }

    this.accountManager.addAccount(created.value);
    await this.pause(`Счёт создан: "${created.value.name}"`);
  }

  public async watchAccount(accountId: string): Promise<void> {
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      await this.pause('Счёт не найден');
      return;
    }

    // цикл меню выбранного счёта
    // eslint-disable-next-line no-constant-condition
    while (true) {
      console.clear();

      const { action } = await inquirer.prompt<{ action: MenuAction }>([
        {
          type: 'list',
          name: 'action',
          message: `Счёт: ${account.name}`,
          choices: [
            { name: '📌 Показать сводку', value: 'back' }, // просто покажем ниже, а потом меню снова
            { name: '➕ Добавить транзакцию', value: 'addTx' },
            { name: '🗑️ Удалить транзакцию', value: 'removeTx' },
            { name: '📤 Экспорт в CSV', value: 'exportCsv' },
            { name: '❌ Удалить счёт', value: 'removeAccount' },
            { name: '⬅️ Назад к списку счетов', value: 'exit' }, // выйдем из watchAccount
          ],
          pageSize: 12,
        },
      ]);

      if (action === 'back') {
        await this.showAccountSummary(accountId);
        continue;
      }

      if (action === 'addTx') {
        await this.addTransaction(accountId);
        continue;
      }

      if (action === 'removeTx') {
        await this.removeTransaction(accountId);
        continue;
      }

      if (action === 'exportCsv') {
        await this.exportTransactionsToCSV(accountId);
        continue;
      }

      if (action === 'removeAccount') {
        const removed = await this.removeAccount(accountId);
        if (removed) return;
        continue;
      }

      if (action === 'exit') return;
    }
  }

  private async showAccountSummary(accountId: string): Promise<void> {
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      await this.pause('Счёт не найден');
      return;
    }

    console.clear();
    console.log(account.getSummaryString());
    console.log('\nТранзакции:\n');

    if (account.transactions.length === 0) {
      console.log('— транзакций пока нет —');
    } else {
      account.transactions.forEach((t, i) => {
        console.log(`${i + 1}. ${t.toString()}`);
      });
    }

    await this.pause();
  }

  public async addTransaction(accountId: string): Promise<void> {
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      await this.pause('Счёт не найден');
      return;
    }

    console.clear();

    const answers = await inquirer.prompt<{
      amount: string;
      type: TransactionType;
      date: string;
      description: string;
    }>([
      {
        type: 'input',
        name: 'amount',
        message: 'Сумма (число больше 0):',
        validate: (v: string) => {
          const n = Number(v);
          if (!Number.isFinite(n) || n <= 0) return 'Введите число больше 0';
          return true;
        },
      },
      {
        type: 'list',
        name: 'type',
        message: 'Тип транзакции:',
        choices: [
          { name: 'Доход', value: 'income' },
          { name: 'Расход', value: 'expense' },
        ],
      },
      {
        type: 'input',
        name: 'date',
        message: 'Дата (YYYY-MM-DD, пусто = сегодня):',
        default: '',
        validate: (v: string) => {
          const s = v.trim();
          if (s.length === 0) return true;
          return /^\d{4}-\d{2}-\d{2}$/.test(s)
            ? true
            : 'Формат даты: YYYY-MM-DD';
        },
      },
      {
        type: 'input',
        name: 'description',
        message: 'Описание (необязательно):',
        default: '',
      },
    ]);

    const amount = Number(answers.amount);

    const created = Transaction.create({
      accountId: account.id,
      amount,
      type: answers.type,
      date: answers.date,
      description: answers.description,
    });

    if (!created.ok) {
      await this.pause(`Не удалось создать транзакцию: ${created.error}`);
      return;
    }

    account.addTransaction(created.value);
    await this.pause('Транзакция добавлена');
  }

  public async removeTransaction(accountId: string): Promise<void> {
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      await this.pause('Счёт не найден');
      return;
    }

    if (account.transactions.length === 0) {
      await this.pause('Транзакций нет — удалять нечего');
      return;
    }

    console.clear();

    const choices = account.transactions.map((t) => ({
      name: t.toString(),
      value: t.id,
    }));

    const { txId } = await inquirer.prompt<{ txId: string }>([
      {
        type: 'list',
        name: 'txId',
        message: 'Выбери транзакцию для удаления:',
        choices,
        pageSize: 12,
      },
    ]);

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Точно удалить?',
        default: false,
      },
    ]);

    if (!confirm) {
      await this.pause('Удаление отменено');
      return;
    }

    const ok = account.removeTransaction(txId);
    await this.pause(
      ok ? 'Транзакция удалена' : 'Не удалось удалить транзакцию'
    );
  }

  public async removeAccount(accountId: string): Promise<boolean> {
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      await this.pause('Счёт не найден');
      return false;
    }

    console.clear();

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Удалить счёт "${account.name}" и все его транзакции?`,
        default: false,
      },
    ]);

    if (!confirm) {
      await this.pause('Удаление отменено');
      return false;
    }

    const ok = this.accountManager.removeAccount(accountId);
    await this.pause(ok ? 'Счёт удалён' : 'Не удалось удалить счёт');
    return ok;
  }

  public async exportTransactionsToCSV(accountId: string): Promise<void> {
    const account = this.accountManager.getAccountById(accountId);
    if (!account) {
      await this.pause('Счёт не найден');
      return;
    }

    console.clear();

    const { fileBase } = await inquirer.prompt<{ fileBase: string }>([
      {
        type: 'input',
        name: 'fileBase',
        message: 'Имя файла для экспорта (без расширения, пусто = авто):',
        default: '',
      },
    ]);

    // Метод в классе Account, но интерфейс IAccount его не описывает.
    // Поэтому делаем безопасное приведение (реально это будет Account).
    const acc = account as Account;

    try {
      const filename = await acc.exportTransactionsToCSV(fileBase);
      await this.pause(`Экспорт готов: ${filename}`);
    } catch (e: unknown) {
      await this.pause(`Ошибка экспорта: ${String(e)}`);
    }
  }

  private async pause(message?: string): Promise<void> {
    if (message) {
      console.log('\n' + message);
    }
    await inquirer.prompt([
      { type: 'input', name: '_', message: 'Enter — продолжить' },
    ]);
  }
}

function seedInitialState(controller: ApplicationController): void {
  const personal = Account.create({ name: 'Личный бюджет' });
  const vacation = Account.create({ name: 'Копилка на отпуск' });

  if (personal.ok) {
    const a = personal.value;

    const tx1 = Transaction.create({
      accountId: a.id,
      amount: 1000,
      type: 'income',
      date: '2023-01-01',
      description: 'Зарплата',
    });

    const tx2 = Transaction.create({
      accountId: a.id,
      amount: 200,
      type: 'expense',
      date: '2023-01-05',
      description: 'Продукты',
    });

    const tx3 = Transaction.create({
      accountId: a.id,
      amount: 150,
      type: 'expense',
      date: '2023-01-09',
      description: 'Коммунальные услуги',
    });

    if (tx1.ok) a.addTransaction(tx1.value);
    if (tx2.ok) a.addTransaction(tx2.value);
    if (tx3.ok) a.addTransaction(tx3.value);

    controller.accountManager.addAccount(a);
  }

  if (vacation.ok) {
    const a = vacation.value;

    const tx1 = Transaction.create({
      accountId: a.id,
      amount: 500,
      type: 'income',
      date: '2023-04-01',
      description: 'Премия',
    });

    const tx2 = Transaction.create({
      accountId: a.id,
      amount: 600,
      type: 'income',
      date: '2023-01-01',
      description: 'Возврат долга',
    });

    const tx3 = Transaction.create({
      accountId: a.id,
      amount: 300,
      type: 'expense',
      date: '2023-01-05',
      description: 'Билеты на самолёт',
    });

    const tx4 = Transaction.create({
      accountId: a.id,
      amount: 200,
      type: 'expense',
      date: '2023-01-09',
      description: 'Номер в отеле',
    });

    if (tx1.ok) a.addTransaction(tx1.value);
    if (tx2.ok) a.addTransaction(tx2.value);
    if (tx3.ok) a.addTransaction(tx3.value);
    if (tx4.ok) a.addTransaction(tx4.value);

    controller.accountManager.addAccount(a);
  }
}
