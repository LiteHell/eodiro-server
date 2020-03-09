import Db from '@/db'
import { UserModel, UserModelPasswordOmitted } from '@/db/models'
import Auth, { SignUpInfo } from '@/modules/auth'
import EodiroMailer from '@/modules/eodiro-mailer'
import rng from '@/modules/random-name-generator'
import SqlB from '@/modules/sqlb'
import Time from '@/modules/time'

export type UserId = number

export default class User {
  static async findWithPortalId(portalId: string): Promise<UserModel | false> {
    portalId = portalId.trim()

    const query = `
      select *
      from user
      where portal_id = ?
    `

    const [err, results] = await Db.query(query, [portalId])

    if (err) {
      console.error(err)
      return false
    }

    if (results.length === 0) {
      return undefined
    }

    const user: UserModel = results[0]

    return user
  }

  static async findAtId(id: number): Promise<UserModelPasswordOmitted | false> {
    const query = SqlB<UserModel>()
      .select('id', 'nickname', 'portal_id', 'random_nickname', 'registered_at')
      .from('user')
      .where(SqlB().equal('id', undefined))
      .build()

    const [err, results] = await Db.query<UserModelPasswordOmitted[]>(query, id)

    if (err) {
      return false
    }

    if (results.length === 0) {
      return undefined
    }

    const user = results[0]

    return user
  }

  static async findWithAttrFromAll(
    attrName: 'portal_id' | 'nickname',
    value: string
  ): Promise<UserModel | false> {
    if (attrName !== 'portal_id' && attrName !== 'nickname') {
      return undefined
    }

    const query = `
      select id, portal_id, registered_at, nickname, random_nickname
      from
      (
        select id, portal_id, registered_at, nickname, random_nickname
        from user
        union
        select id, portal_id, registered_at, nickname, random_nickname
        from pending_user
      ) user_union
      where ${attrName} = ?
    `
    const [err, results] = await Db.query(query, value)

    if (err) {
      console.error(err.stack)
      return undefined
    }

    if (results.length === 0) {
      return undefined
    }

    return results[0]
  }

  static async findWithToken(token: string): Promise<UserModel | false> {
    const query = `
      select *
      from pending_user
      where token = ?
    `
    const [err, results] = await Db.query(query, token)

    if (err) {
      console.error(err.stack)
      return false
    }

    if (results.length === 0) {
      return undefined
    }

    return results[0]
  }

  /**
   * Add a new user to pending_user table.
   *
   * **_NOTE_**: Pass raw password instead of encrypted one.
   *
   * @returns Returns generated token(verification code)
   */
  static async addPendingUser(info: SignUpInfo): Promise<string | false> {
    const query = `
      insert into pending_user
      (portal_id, password, registered_at, nickname, random_nickname, token)
      values (?, ?, ?, ?, ?, ?)
    `
    const encryptedPassword = await Auth.encryptPw(info.password)
    const pendingToken = Auth.generatePendingToken()
    const values = [
      info.portalId,
      encryptedPassword,
      Time.getCurrTime(),
      info.nickname,
      rng(),
      pendingToken,
    ]
    const [err] = await Db.query(query, values)

    if (err) {
      console.error(err.stack)
      return false
    }

    return pendingToken
  }

  /**
   * Transfer pending user to active user.
   */
  static async transferPendingUser(pendingUserId: number): Promise<boolean> {
    const query = `
      insert into user (portal_id, password, registered_at, nickname, random_nickname)
      select portal_id, password, registered_at, nickname, random_nickname
      from pending_user
      where id = ?;
      delete from pending_user
      where id = ?;
    `
    const [err] = await Db.query(query, [pendingUserId, pendingUserId])

    if (err) {
      console.error(err.stack)
      return false
    }

    return true
  }

  // TODO: update password
  // static async updatePassword(
  //   userId: number,
  //   newPassword: string
  // ): Promise<boolean> {
  //   const query = `
  //     update user
  //     set password = ?
  //     where id = ?
  //   `
  // }

  /**
   * Update all users' random nickname.
   */
  static async updateRandomNickname(): Promise<void> {
    const query = `select * from user`
    const [err, results] = await Db.query(query)

    if (err) {
      console.error(err)
      return
    }

    results.forEach((user: UserModel) => {
      const query = `
        update user
        set random_nickname = ?
        where id = ${user.id}
      `
      const values = [rng()]
      Db.query(query, values)
    })

    // TODO: send email from the bot
    EodiroMailer.sendMail({
      to: 'contact@payw.org',
      subject: 'Updating user random nickname',
    })
  }
}
