import { ApplicationController } from './classes/index.js';

const controller = new ApplicationController();

controller.start().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
