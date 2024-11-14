const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean up database before tests
  await prisma.$transaction([
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.complaint.deleteMany(),
    prisma.review.deleteMany(),
    prisma.noticeApprenticeship.deleteMany(),
    prisma.project.deleteMany(),
    prisma.garage.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

afterAll(async () => {
  await prisma.$disconnect();
});