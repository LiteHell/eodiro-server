import { PostAttrs } from '@/database/models/post'
import { getUser } from '@/database/models/user'
import Db from '@/db'
import Auth from '@/modules/auth'
import SqlB from '@/modules/sqlb'
import express from 'express'

const router = express.Router()

// Finds and returns user information
router.get('/my/information', async (req, res) => {
  const accessToken = req.headers.accesstoken as string
  const payload = await Auth.isSignedUser(accessToken)
  if (payload) {
    const User = await getUser()
    const userInfo = await User.findAtId(payload.userId)
    res.status(200).json(userInfo)
  } else {
    res.sendStatus(401)
  }
})

router.get('/my/posts', async (req, res) => {
  const accessToken = req.headers.accesstoken as string
  const payload = await Auth.isSignedUser(accessToken)
  const amount = Number(req.query.amount || 10)
  const offset = Number(req.query.offset || 0)

  if (!payload) {
    res.sendStatus(401)
    return
  }

  const query = SqlB()
    .select('*')
    .from('post')
    .where()
    .equal('user_id', payload.userId)
    .order('id', 'desc')
    .limit(amount, offset)
    .build()
  const [err, results] = await Db.query<PostAttrs[]>(query)
  if (err) {
    res.sendStatus(500)
    return
  }

  res.json(results)
})

export default router
