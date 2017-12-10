const debug = require('debug')('@cypress/snapshot')
const fs = require('fs')
const path = require('path')
const utils = require('./utils')
const amDependency = require('am-i-a-dependency')()

if (amDependency) {
  // yes, do something interesting
  // someone is executing "npm install foo"
  debug('post install - in folder', process.cwd())
  // we are in <owner>/node_modules/@cypress/snapshot
  // but want to be simply in <owner> folder
  const ownerFolder = path.normalize(path.join(process.cwd(), '..', '..', '..'))
  const filename = path.join(ownerFolder, utils.SNAPSHOT_FILE_NAME)

  if (!fs.existsSync(filename)) {
    // save initial empty snapshot object
    debug('writing initial file', filename)
    fs.writeFileSync(filename, '{}\n')
  } else {
    debug('file %s already exists', filename)
  }
} else {
  debug('not a dependency install')
}
