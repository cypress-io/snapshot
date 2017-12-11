'use strict'

/* global cy, Cypress */
const itsName = require('its-name')
const { initStore } = require('snap-shot-store')
const la = require('lazy-ass')
const is = require('check-more-types')
const switchcase = require('switchcase')
const compare = require('snap-shot-compare')

const {
  isJqueryElement,
  serializeReactToHTML,
  identity,
  countSnapshots
} = require('./utils')

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

  const SNAPSHOT_FILENAME = 'snapshots.js'

  function evaluateLoadedSnapShots (js) {
    la(is.string(js), 'expected JavaScript snapshot source', js)
    console.log('read snapshots.js file')
    const store = eval(js) || {}
    console.log('have %d snapshot(s)', countSnapshots(store))
    storeSnapshot = initStore(store)
  }

  global.before(() => {
    cy.log('before all tests')
    cy
    .readFile(SNAPSHOT_FILENAME, 'utf-8', { log: false })
    .then(evaluateLoadedSnapShots)
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
    if (isJqueryElement($el)) {
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
        throw new Error(`Snapshot difference\n${json.message}`)
      })
    }

    Cypress.log(options)
    storeSnapshot({
      value,
      name,
      // compare: compareValues,
      raiser: cyRaiser
    })
  }

  const pickSerializer = switchcase({
    // [isJqueryElement]: serializeDomElement,
    [isJqueryElement]: serializeReactToHTML,
    default: identity
  })

  function snapshot (value, humanName) {
    console.log('human name', humanName)
    const snapshotName = getSnapshotName(this.test, humanName)
    const serializer = pickSerializer(value)
    const serialized = serializer(value)
    setSnapshot(snapshotName, serialized, value, humanName)

    // always just pass value
    return value
  }

  Cypress.Commands.add('snapshot', { prevSubject: true }, snapshot)

  global.after(() => {
    if (storeSnapshot) {
      cy.log('saving snapshots')
      const snapshots = storeSnapshot()
      console.log('%d snapshot(s) on finish', countSnapshots(snapshots))
      console.log(snapshots)

      snapshots.__version = Cypress.version
      const s = JSON.stringify(snapshots, null, 2)
      const str = `module.exports = ${s}\n`
      cy.writeFile(SNAPSHOT_FILENAME, str, 'utf-8', { log: false })
    }
  })
}

module.exports = registerCypressSnapshot
