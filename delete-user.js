const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteUser() {
  try {
    const email = process.argv[2]
    if (!email) {
      console.log('Usage: node delete-user.js <email>')
      process.exit(1)
    }

    const deleted = await prisma.user.deleteMany({
      where: { email }
    })

    console.log(`Deleted ${deleted.count} user(s) with email: ${email}`)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteUser()
