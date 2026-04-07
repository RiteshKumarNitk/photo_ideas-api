import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'Admin@123';
  const username = process.argv[4] || 'admin';

  console.log(`Creating admin user: ${email}`);

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
      role: 'admin',
      username,
    },
    create: {
      email,
      passwordHash: hashedPassword,
      username,
      role: 'admin',
    },
  });

  console.log(`Admin user created/updated successfully!`);
  console.log(`Email: ${user.email}`);
  console.log(`Username: ${user.username}`);
  console.log(`Role: ${user.role}`);
  console.log(`\nYou can now login with:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
