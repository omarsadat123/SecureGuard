import session from 'express-session';

export class PrismaSessionStore extends session.Store {
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }
  get(sid, callback) {
    this.prisma.session
      .findUnique({ where: { sid } })
      .then((record) => {
        if (!record || record.expiresAt <= new Date()) return callback(null, null);
        callback(null, record.data);
      })
      .catch(callback);
  }
  set(sid, value, callback = () => {}) {
    const expiresAt = value.cookie?.expires
      ? new Date(value.cookie.expires)
      : new Date(Date.now() + 3600000);
    this.prisma.session
      .upsert({
        where: { sid },
        create: { sid, data: value, expiresAt },
        update: { data: value, expiresAt }
      })
      .then(() => callback())
      .catch(callback);
  }
  destroy(sid, callback = () => {}) {
    this.prisma.session
      .deleteMany({ where: { sid } })
      .then(() => callback())
      .catch(callback);
  }
  touch(sid, value, callback = () => {}) {
    this.set(sid, value, callback);
  }
}
