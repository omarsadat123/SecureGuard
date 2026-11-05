import { PrismaClient } from '@prisma/client';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { PrismaUserRepository } from './repositories/userRepository.js';
import { PrismaSessionStore } from './stores/prismaSessionStore.js';
import { AuthService } from './services/authService.js';

const config = loadConfig();
const prisma = new PrismaClient();
const users = new PrismaUserRepository(prisma);
const app = createApp({
  config,
  authService: new AuthService(users),
  sessionStore: new PrismaSessionStore(prisma)
});
const server = app.listen(config.PORT, '0.0.0.0', () =>
  console.log(`SecureGuard API listening on port ${config.PORT}`)
);

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
