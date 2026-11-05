export class PrismaUserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }
  findByEmail(email) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  findById(id) {
    return this.prisma.user.findUnique({ where: { id } });
  }
  create(data) {
    return this.prisma.user.create({ data });
  }
}

export class MemoryUserRepository {
  constructor(seed = []) {
    this.users = seed.map((user) => ({ ...user }));
  }
  async findByEmail(email) {
    return this.users.find((user) => user.email === email) ?? null;
  }
  async findById(id) {
    return this.users.find((user) => user.id === id) ?? null;
  }
  async create(data) {
    if (await this.findByEmail(data.email)) {
      const error = new Error('Unique constraint');
      error.code = 'P2002';
      throw error;
    }
    const user = {
      id: `user-${this.users.length + 1}`,
      role: 'USER',
      createdAt: new Date(),
      ...data
    };
    this.users.push(user);
    return user;
  }
}
