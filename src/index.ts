import inquirer from 'inquirer';

async function main(): Promise<void> {
  console.clear();

  const { action } = await inquirer.prompt<{ action: 'exit' }>([
    {
      type: 'list',
      name: 'action',
      message: 'Budget Tracker CLI',
      choices: [{ name: 'Выход', value: 'exit' }],
    },
  ]);

  if (action === 'exit') {
    console.clear();
    process.exit(0);
  }
}

main().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
