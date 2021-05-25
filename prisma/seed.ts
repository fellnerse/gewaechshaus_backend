import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const deviceData = [
  {
    name: 'Wohnzimmer',
    hostname: 'esp3',
  },
]

async function main() {
  console.log(`Start seeding ...`)
  for (const u of deviceData) {
    const device = await prisma.device.create({
      data: u,
    })
    console.log(`Created user with id: ${device.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
