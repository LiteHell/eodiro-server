import Db from '@/db'
import { DbTables } from '@/db/constants'
import SqlB from '@/modules/sqlb'
import Config from '@@/config'
import chalk from 'chalk'
import {
  createAdminTable,
  createCafeteriaMenuTable,
  createCommentTable,
  createCoverageCollegeTable,
  createCoverageMajorLectureTable,
  createCoverageMajorTable,
  createInquiryTable,
  createLectureTable,
  createPendingUserTable,
  createPeriodTable,
  createPostTable,
  createRefreshTokenTable,
  createUserTable,
} from '../models'

const log = console.log

const database =
  process.env.NODE_ENV === 'development' ? Config.DB_NAME_DEV : Config.DB_NAME

async function validateTable(
  tableName: string,
  createFunction: () => Promise<void>
): Promise<boolean> {
  const sql = SqlB()
    .select('*')
    .from('INFORMATION_SCHEMA.TABLES')
    .where(
      SqlB()
        .equal('TABLE_SCHEMA', database)
        .andEqual('TABLE_NAME', tableName)
    )
    .build()

  const [err, results] = await Db.query(sql)

  if (err) {
    return false
  }

  if (results.length > 0) {
    log(
      `[ ${chalk.greenBright('✔')} ${chalk.cyan(
        'table'
      )} ] '${tableName}' exists`
    )
    return true
  } else {
    log(
      `[ ${chalk.red('x')} ${chalk.cyan(
        'table'
      )} ] ${tableName}' doesn't exists`
    )
    log(
      `[ ${chalk.blue('↻')} ${chalk.cyan(
        'table'
      )} ] creating a table '${tableName}'`
    )
    await createFunction()
    return false
  }
}

export default async function dbValidator(): Promise<void> {
  log(`[ ${chalk.green('db')} ] validating db '${database}'`)

  await validateTable(DbTables.ADMIN, createAdminTable)
  await validateTable(DbTables.USER, createUserTable)
  await validateTable(DbTables.PENDING_USER, createPendingUserTable)
  await validateTable(DbTables.REFRESH_TOKEN, createRefreshTokenTable)
  await validateTable(DbTables.COVERAGE_COLLEGE, createCoverageCollegeTable)
  await validateTable(DbTables.COVERAGE_MAJOR, createCoverageMajorTable)
  await validateTable(DbTables.LECTURE, createLectureTable)
  await validateTable(DbTables.PERIOD, createPeriodTable)
  await validateTable(
    DbTables.COVERAGE_MAJOR_LECTURE,
    createCoverageMajorLectureTable
  )
  await validateTable(DbTables.CAFETERIA_MENU, createCafeteriaMenuTable)
  await validateTable(DbTables.POST, createPostTable)
  await validateTable(DbTables.COMMENT, createCommentTable)
  await validateTable(DbTables.INQUIRY, createInquiryTable)
}
