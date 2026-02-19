import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Admin user created: ${admin.email}`);

  const tl1 = await prisma.topLevel.create({
    data: {
      name: 'Digital Marketing',
      userId: admin.id,
      order: 0,
      keywords: {
        create: [
          {
            keyword: 'SEO best practices',
            goal: 'Educate readers on modern SEO techniques',
            audience: 'Small business owners and bloggers',
            results: {
              create: [
                { keywordText: 'SEO for beginners', title: '10 SEO Best Practices That Actually Work in 2024', status: 'READY' },
                { keywordText: 'on-page SEO tips', title: 'The Complete On-Page SEO Checklist', status: 'DRAFT' },
                { keywordText: 'SEO mistakes to avoid', title: '7 Common SEO Mistakes Killing Your Rankings', status: 'DONE' },
              ],
            },
          },
          {
            keyword: 'content marketing strategy',
            goal: 'Help businesses build content plans',
            audience: 'Marketing managers and content creators',
          },
        ],
      },
    },
  });

  const tl2 = await prisma.topLevel.create({
    data: {
      name: 'E-commerce Tips',
      userId: admin.id,
      order: 1,
      keywords: {
        create: [
          {
            keyword: 'increase online sales',
            goal: 'Drive conversions and revenue',
            audience: 'E-commerce store owners',
            results: {
              create: [
                { keywordText: 'boost ecommerce sales', title: 'How to Increase Online Sales by 40% This Quarter', status: 'PROGRESS' },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Sample data created: ${tl1.name}, ${tl2.name}`);
  console.log('\nLogin credentials:');
  console.log('  Email: admin@example.com');
  console.log('  Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
