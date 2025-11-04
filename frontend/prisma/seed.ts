import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Insert SOL token (Native Mint)
  const solToken = await prisma.token.upsert({
    where: { mintAddress: 'So11111111111111111111111111111111111111112' },
    update: {},
    create: {
      mintAddress: 'So11111111111111111111111111111111111111112',
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      supply: '0', // Native mint has variable supply
      imageUrl: null,
      creator: 'SYSTEM',
      signature: 'NATIVE_TOKEN',
      whitelisted: true, // SOL should be whitelisted by default
    },
  });

  console.log('✅ SOL token seeded:', solToken.mintAddress);
  console.log('📊 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
