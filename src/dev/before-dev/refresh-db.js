const fs = require('fs')
const prettier = require('prettier')
const appRoot = require('app-root-path')
const chalk = require('chalk')
const prettierOptionsTS = require('../../../prettier.config')
const { pascalCase, camelCase } = require('change-case')
const clearDirectory = require('../clear-directory')

let prettierOptions = { ...prettierOptionsTS }
prettierOptions.parser = 'babel'

// Update DB constants

// Directory paths
const dbSchemaCreateDir = './src/db/schema/create'
const dbConstantsDir = './src/db/utils/constants.ts'

const dbSchemaFiles = fs
  .readdirSync(dbSchemaCreateDir)
  .filter((file) => file.endsWith('.js'))
const dbSchemaNames = dbSchemaFiles.map((file) => file.replace(/.js$/g, ''))

// Auth-generated message to prevent accident modification
const msg = `
/**
 * Copyright 2020 jhaemin
 *
 * Refresh DB
 *
 * This file is automatically generated
 * by the script "refresh-db".
 * Do not modify this file manually.
 * If there comes a situation where this file
 * should move to other place,
 * please update the source "src/dev/refresh-db.js".
 */
`

const dbConstantsData = `
${msg}

export type DbTableNames = ${dbSchemaNames
  .map((schema) => `'${schema}'`)
  .join('|')}

export const DbTables: Record<DbTableNames, DbTableNames> = {
  ${dbSchemaNames.map((schema) => `${schema}: '${schema}'`).join(',')}
}
`
fs.writeFileSync(
  dbConstantsDir,
  prettier.format(dbConstantsData, prettierOptionsTS)
)

/**
 * ------------------------------------------------
 * Convert db schema in SQL to TypeScript interface
 * ------------------------------------------------
 */

/**
 * @param {string} sqlType
 */
function sqlTypeToTSType(sqlType) {
  return sqlType.includes('int') ? 'number' : 'string'
}

// generated directory
const dbSchemaGeneratedDir = './src/db/schema/generated'

// index.ts for export all
let indexTS = msg + '\n'

// Clear directory before generation
clearDirectory(dbSchemaGeneratedDir)

// Loop through schema files
dbSchemaFiles.forEach((file, i) => {
  const schemaName = dbSchemaNames[i]

  // Parse SQL and generate TypeScript interface
  const sql = require(appRoot.resolve(`/src/db/schema/create/${file}`))
  const regExp = /`?([a-zA-Z_]*)`? (int|bigint|smallint|tinyint|char|text|varchar|json|date|datetime)/g
  const attrs = []
  let match = regExp.exec(sql)

  while (match !== null) {
    if (!match[1] || !match[2]) {
      throw new Error(
        `[ ${chalk.red(
          'refresh-db'
        )} ] occurs an error while parsing the create sql of '${file}'`
      )
    }

    match[2] = sqlTypeToTSType(match[2])
    attrs.push([match[1], match[2]])

    // Find next attriute
    match = regExp.exec(sql)
  }

  // Create TypeScript file
  const schemaTS = `
${msg}

export type ${pascalCase(schemaName)} = {
  ${attrs.map((attr) => `${attr[0]}: ${attr[1]}`).join('\n')}
}

export type ${pascalCase(schemaName)}s = ${pascalCase(schemaName)}[]

export const ${camelCase(schemaName)}Fields = [
${attrs.map((attr) => `'${attr[0]}'`).join(',\n')}
]
`

  fs.writeFileSync(
    dbSchemaGeneratedDir + `/${schemaName}.schema.ts`,
    prettier.format(schemaTS, prettierOptionsTS)
  )

  indexTS += `export * from './${schemaName}.schema'\n`
})

// Create index.ts which export all of the interface above
fs.writeFileSync(
  dbSchemaGeneratedDir + '/index.ts',
  prettier.format(indexTS, prettierOptionsTS)
)
