import mysql from 'mysql'
import Config from '@@/config'

export default class DbConnector {
  private static connection: mysql.Connection | undefined

  static connect(): Promise<boolean> {
    return new Promise(resolve => {
      if (this.connection) {
        return
      }

      const database =
        Config.NODE_ENV === 'development' ? Config.DB_NAME_DEV : Config.DB_NAME

      this.connection = mysql.createConnection({
        host: Config.DB_HOST,
        user: Config.DB_USER,
        password: Config.DB_PASSWORD,
        database,
        multipleStatements: true
      })

      console.info(
        `📦 Connecing to DB (host: ${Config.DB_HOST}, user: ${Config.DB_USER})`
      )

      this.connection.connect(err => {
        if (err) {
          this.connection = undefined
          console.error(err.message)
          console.error('❌ Could not connect to Database')
          resolve(false)
        } else {
          console.error('⭕️ Successfully connected to DB')
          resolve(true)
        }
      })
    })
  }

  static async getConnection(): Promise<mysql.Connection> {
    if (!this.connection) {
      await this.connect()
    }

    return this.connection
  }
}
