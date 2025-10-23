const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearUsers() {
  try {
    const deleted = await prisma.user.deleteMany({})
    console.log(`Deleted ${deleted.count} user(s)`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearUsers()
