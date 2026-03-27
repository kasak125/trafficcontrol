import "dotenv/config";
import { PrismaClient, IntersectionStatus } from "@prisma/client";
import { defaultIntersections } from "../src/simulator/defaultIntersections.js";

const prisma = new PrismaClient();

async function upsertIntersection(intersection) {
  if (intersection.legacyName) {
    const legacyRecord = await prisma.intersection.findUnique({
      where: { name: intersection.legacyName },
    });

    if (legacyRecord) {
      await prisma.intersection.update({
        where: { id: legacyRecord.id },
        data: {
          name: intersection.name,
          location: intersection.location,
          status: IntersectionStatus.OPERATIONAL,
        },
      });

      return;
    }
  }

  await prisma.intersection.upsert({
    where: { name: intersection.name },
    update: {
      location: intersection.location,
      status: IntersectionStatus.OPERATIONAL,
    },
    create: {
      name: intersection.name,
      location: intersection.location,
      status: IntersectionStatus.OPERATIONAL,
    },
  });
}

async function seed() {
  for (const intersection of defaultIntersections) {
    await upsertIntersection(intersection);
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to seed intersections", error);
    await prisma.$disconnect();
    process.exit(1);
  });
