import { boot } from '@/boot'
import { User } from '@/database/models/user'

async function run() {
  const quit = await boot({
    db: true,
    mail: true,
  })

  await User.updateRandomNickname()

  quit()
  process.exit()
}

run().catch(() => {
  process.exit()
})
