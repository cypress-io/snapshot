'use strict'

/* global cy, Cypress */
const itsName = require('its-name')
const { initStore } = require('snap-shot-store')
const la = require('lazy-ass')
const is = require('check-more-types')
const compare = require('snap-shot-compare')
const path = require('path')

const {
  serializeDomElement,
  serializeReactToHTML,
  identity,
  countSnapshots
} = require('./utils')

const DEFAULT_CONFIG_OPTIONS = {
  // using relative snapshots requires a simple
  // 'readFileMaybe' plugin to be configured
  // see https://on.cypress.io/task#Read-a-file-that-might-not-exist
  useRelativeSnapshots: false,
  snapshotFileName: 'snapshots.js'
}

/* eslint-disable no-console */

function compareValues ({ expected, value }) {
  const noColor = true
  const json = true
  return compare({ expected, value, noColor, json })
}

function registerCypressSnapshot () {
  la(is.fn(global.before), 'missing global before function')
  la(is.fn(global.after), 'missing global after function')
  la(is.object(global.Cypress), 'missing Cypress object')

  const useRelative = Cypress.config('useRelativeSnapshots')
  const config = {
    useRelativeSnapshots: useRelative === undefined ? DEFAULT_CONFIG_OPTIONS.useRelativeSnapshots : useRelative,
    snapshotFileName: Cypress.config('snapshotFileName') || DEFAULT_CONFIG_OPTIONS.snapshotFileName
  }

  console.log('registering @cypress/snapshot')

  let storeSnapshot

  // for each full test name, keeps number of snapshots
  // allows using multiple snapshots inside single test
  // without confusing them
  // eslint-disable-next-line immutable/no-let
  let counters = {}

  function getSnapshotIndex (key) {
    if (key in counters) {
      // eslint-disable-next-line immutable/no-mutation
      counters[key] += 1
    } else {
      // eslint-disable-next-line immutable/no-mutation
      counters[key] = 1
    }
    return counters[key]
  }

  let snapshotFileName = config.snapshotFileName
  if (config.useRelativeSnapshots) {
    let relative = Cypress.spec.relative
    if (Cypress.platform === 'win32') {
      relative = relative.replace(/\\/g, path.sep)
    }

    snapshotFileName = path.join(path.dirname(relative), config.snapshotFileName)
  }

  function evaluateLoadedSnapShots (js) {
    la(is.string(js), 'expected JavaScript snapshot source', js)
    console.log('read snapshots.js file')
    const store = eval(js) || {}
    console.log('have %d snapshot(s)', countSnapshots(store))
    storeSnapshot = initStore(store)
  }

  global.before(function loadSnapshots () {
    let readFile

    if (config.useRelativeSnapshots) {
      readFile = cy
      .task('readFileMaybe', snapshotFileName)
      .then(function (contents) {
        if (!contents) {
          return cy.writeFile(snapshotFileName, '', 'utf-8', { log: false })
        }

        return contents
      })
    } else {
      readFile = cy
      .readFile(snapshotFileName, 'utf-8')
    }

    readFile.then(evaluateLoadedSnapShots)
    // no way to catch an error yet
  })

  function getTestName (test) {
    const names = itsName(test)
    // la(is.strings(names), 'could not get name from current test', test)
    return names
  }

  function getSnapshotName (test, humanName) {
    const names = getTestName(test)
    const key = names.join(' - ')
    const index = humanName || getSnapshotIndex(key)
    names.push(String(index))
    return names
  }

  function setSnapshot (name, value, $el) {
    // snapshots were not initialized
    if (!storeSnapshot) {
      return
    }

    // show just the last part of the name list (the index)
    const message = Cypress._.last(name)
    console.log('current snapshot name', name)

    const devToolsLog = {
      value
    }
    if (Cypress.dom.isJquery($el)) {
      // only add DOM elements, otherwise "expected" value is enough
      devToolsLog.$el = $el
    }

    const options = {
      name: 'snapshot',
      message,
      consoleProps: () => devToolsLog
    }

    if ($el) {
      options.$el = $el
    }

    const cyRaiser = ({ value, expected }) => {
      const result = compareValues({ expected, value })
      result.orElse((json) => {
        // by deleting property and adding it at the last position
        // we reorder how the object is displayed
        // We want convenient:
        //   - message
        //   - expected
        //   - value
        devToolsLog.message = json.message
        devToolsLog.expected = expected
        delete devToolsLog.value
        devToolsLog.value = value
        throw new Error(`Snapshot difference. To update, delete snapshot and rerun test.\n${json.message}`)
      })
    }

    Cypress.log(options)
    storeSnapshot({
      value,
      name,
      raiser: cyRaiser
    })
  }

  const pickSerializer = (asJson, value) => {
    if (Cypress.dom.isJquery(value)) {
      return asJson ? serializeDomElement : serializeReactToHTML
    }
    return identity
  }

  function snapshot (value, { name, json } = {}) {
    console.log('human name', name)
    const snapshotName = getSnapshotName(this.test, name)
    const serializer = pickSerializer(json, value)
    const serialized = serializer(value)
    setSnapshot(snapshotName, serialized, value)

    // always just pass value
    return value
  }

  Cypress.Commands.add('snapshot', { prevSubject: true }, snapshot)

  global.after(function saveSnapshots () {
    if (storeSnapshot) {
      const snapshots = storeSnapshot()
      console.log('%d snapshot(s) on finish', countSnapshots(snapshots))
      console.log(snapshots)

      snapshots.__version = Cypress.version
      const s = JSON.stringify(snapshots, null, 2)
      const str = `module.exports = ${s}\n`
      cy.writeFile(snapshotFileName, str, 'utf-8', { log: false })
    }
  })

  return snapshot
}

module.exports = {
  register: registerCypressSnapshot
}
