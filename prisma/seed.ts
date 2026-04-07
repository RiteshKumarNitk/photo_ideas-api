import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...\n');

  // Create admin user
  const adminEmail = process.argv[2] || 'admin@example.com';
  const adminPassword = process.argv[3] || 'Admin@123';
  const adminUsername = process.argv[4] || 'admin';

  console.log(`Creating admin user: ${adminEmail}`);
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      role: 'admin',
      username: adminUsername,
    },
    create: {
      email: adminEmail,
      passwordHash: hashedPassword,
      username: adminUsername,
      role: 'admin',
    },
  });
  console.log(`Admin created: ${admin.email}\n`);

  // Create sample categories
  const categories = [
    {
      name: 'Nature',
      icon: 'NaturePeople',
      color: '#4CAF50',
      subcategories: ['Flowers', 'Landscapes', 'Trees', 'Sunset', 'Mountains'],
    },
    {
      name: 'Urban',
      icon: 'LocationCity',
      color: '#2196F3',
      subcategories: ['Buildings', 'Streets', 'Bridges', 'Night City', 'Architecture'],
    },
    {
      name: 'Abstract',
      icon: 'Palette',
      color: '#9C27B0',
      subcategories: ['Patterns', 'Textures', 'Colors', 'Minimal', 'Geometric'],
    },
    {
      name: 'People',
      icon: 'People',
      color: '#FF5722',
      subcategories: ['Portrait', 'Street Photography', 'Candid', 'Fashion', 'Family'],
    },
    {
      name: 'Animals',
      icon: 'Pets',
      color: '#795548',
      subcategories: ['Wildlife', 'Pets', 'Birds', 'Insects', 'Marine Life'],
    },
    {
      name: 'Food',
      icon: 'Restaurant',
      color: '#FF9800',
      subcategories: ['Desserts', 'Gourmet', 'Street Food', 'Ingredients', 'Coffee'],
    },
  ];

  console.log('Creating categories...');
  for (const cat of categories) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: { icon: cat.icon, color: cat.color },
      create: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isActive: true,
      },
    });

    for (const subName of cat.subcategories) {
      await prisma.subcategory.upsert({
        where: { name_categoryId: { name: subName, categoryId: category.id } },
        update: {},
        create: {
          name: subName,
          categoryId: category.id,
          isActive: true,
        },
      });
    }
    console.log(`  - ${cat.name} (${cat.subcategories.length} subcategories)`);
  }

  // Create sample quotes
  const quotes = [
    { content: 'Photography is the story I fail to put into words.', author: 'Destin Sparks', category: 'inspiration' },
    { content: 'The best thing about a picture is that it never changes, even when the people in it do.', author: 'Andy Warhol', category: 'wisdom' },
    { content: 'Taking pictures is like tiptoeing into the kitchen late at night and stealing ice cream.', author: 'Joy Division', category: 'humor' },
    { content: 'A photograph is usually looked at – seldom looked into.', author: 'Harper\'s Bazaar', category: 'wisdom' },
    { content: 'When words become unclear, I shall focus with photographs.', author: 'Ansel Adams', category: 'inspiration' },
    { content: 'Photography is the art of frozen time – the ability to store emotion and feelings within a frame.', author: 'Meshack Otieno', category: 'inspiration' },
    { content: 'The camera is an instrument that teaches people how to see without a camera.', author: 'Dorothea Lange', category: 'wisdom' },
    { content: 'Life is like a camera. Focus on what\'s important and capture the good times.', author: 'Unknown', category: 'inspiration' },
    { content: 'Photography is truth. The cinema is truth twenty-four times per second.', author: 'Jean-Luc Godard', category: 'wisdom' },
    { content: 'Cameras don\'t take pictures, photographers do.', author: 'Unknown', category: 'wisdom' },
    { content: 'Every photograph is a certificate of presence.', author: 'Roland Barthes', category: 'wisdom' },
    { content: 'I think good dreaming is what leads to good photography.', author: 'Annie Leibovitz', category: 'inspiration' },
    { content: 'The world is full of magic things, patiently waiting for our senses to grow sharper.', author: 'W.B. Yeats', category: 'nature' },
    { content: 'In photography, the smallest thing can be a great subject.', author: 'Henri Cartier-Bresson', category: 'wisdom' },
    { content: 'Light makes photography. Embrace light. Admire it. Love it. But above all, know light.', author: 'George Tice', category: 'inspiration' },
  ];

  console.log('\nCreating quotes...');
  for (const quote of quotes) {
    await prisma.quote.upsert({
      where: { content: quote.content },
      update: { author: quote.author, category: quote.category },
      create: {
        content: quote.content,
        author: quote.author,
        category: quote.category,
        isActive: true,
      },
    });
  }
  console.log(`  - ${quotes.length} quotes created`);

  // Create sample filters
  const filters = [
    { name: 'Vintage', description: 'Classic film look with warm tones and subtle grain', icon: 'camera_roll', category: 'color' },
    { name: 'Noir', description: 'Dramatic black and white with high contrast', icon: 'contrast', category: 'bw' },
    { name: 'Warm Glow', description: 'Soft golden hour lighting effect', icon: 'wb_sunny', category: 'color' },
    { name: 'Cool Tone', description: 'Blue-shifted tones for a cold, moody look', icon: 'ac_unit', category: 'color' },
    { name: 'High Contrast', description: 'Bold shadows and highlights', icon: 'brightness_7', category: 'effect' },
    { name: 'Soft Focus', description: 'Dreamy, ethereal blur effect', icon: 'blur_on', category: 'effect' },
    { name: 'Sepia', description: 'Warm brown vintage tone', icon: 'filter_vintage', category: 'color' },
    { name: 'Drama', description: 'Cinematic color grading', icon: 'movie', category: 'effect' },
  ];

  console.log('\nCreating filters...');
  for (const filter of filters) {
    await prisma.filter.upsert({
      where: { name: filter.name },
      update: { description: filter.description, icon: filter.icon, category: filter.category },
      create: {
        name: filter.name,
        description: filter.description,
        icon: filter.icon,
        category: filter.category,
        isActive: true,
      },
    });
  }
  console.log(`  - ${filters.length} filters created`);

  console.log('\n✓ Database seeded successfully!');
  console.log(`\nLogin credentials:`);
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
