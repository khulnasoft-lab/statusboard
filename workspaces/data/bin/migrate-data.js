import path from 'path'
import fs from 'fs/promises'
import pLog from 'proc-log'
import logger from '../lib/logger.js'
import getAllData from '../lib/all-data.js'
import wwwPaths from 'www'

logger()

const main = async ({ migrate }) => {
  const dir = wwwPaths.dailyDir

  const migrateData = (data) =>
    JSON.stringify(data.map(migrate), null, 2)

  const allData = await getAllData({ dir })

  for (const [name, data] of allData) {
    await fs.writeFile(path.join(dir, name), migrateData(data))
  }

  await fs.writeFile(wwwPaths.latest, migrateData(require(wwwPaths.latest)))

  return 'Done'
}

// Write your one off migration here
const migrations = {
  '2022-07-28T18:34:09': (data) => {
    const { pendingRelease } = data
    delete data.pendingRelease
    if (data.prs) {
      data.prs.release = pendingRelease
    }
    return data
  },
  '2022-07-28T18:48:54': (data) => {
    if (data.prs?.release) {
      // https://api.github.com/repos/npm/config/issues/73
      // ---> https://github.com/npm/config/pull/73
      const url = new URL(data.prs.release.url)
      url.hostname = 'github.com'
      url.pathname = url.pathname.replace('/repos/', '').replace('/issues/', '/pull/')
      data.prs.release.url = url.toString()
    }
    return data
  },
  '2022-07-28T14:20:50': (data) => {
    if (data.issues?.noLabel) {
      data.issues.unlabeled = data.issues.noLabel
      delete data.issues.noLabel
    }
    return data
  },
}

main({
  migrate: migrations[process.argv[2]],
})
  .then(console.log)
  .catch(err => {
    pLog.log.error(err)
    process.exitCode = 1
  })
