'use strict'

/* global cy, Cypress */
const sd = require('@wildpeaks/snapshot-dom')
const itsName = require('its-name')
const { initStore } = require('snap-shot-store')
const la = require('lazy-ass')
const is = require('check-more-types')

/* eslint-disable no-console */

function registerCypressSnapshot () {
  la(is.fn(global.before), 'missing global before function')
  la(is.fn(global.after), 'missing global after function')
  la(is.object(global.Cypress), 'missing Cypress object')

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
    console.log(js)
    const store = eval(js) || {}
    console.log('store')
    console.log(store)
    storeSnapshot = initStore(store)
  }

  global.before(() => {
    cy.log('before all tests')
    cy.readFile(SNAPSHOT_FILENAME, 'utf-8').then(evaluateLoadedSnapShots)
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

    const options = {
      name: 'snapshot',
      message,
      consoleProps: () => {
        const devToolsLog = {
          value,
          snapshot: message
        }
        if ($el) {
          devToolsLog.$el = $el
        }
        return devToolsLog
      }
    }

    if ($el) {
      options.$el = $el
    }

    Cypress.log(options)
    storeSnapshot({
      value,
      name
    })
  }

  function snapshot$ (test, $el, humanName) {
    console.log('snapshot value!', $el)
    const json = sd.toJSON($el.context)
    // remove React id, too transient
    delete json.attributes['data-reactid']
    console.log('as json', json)

    // hmm, why is value not serialized?
    if ($el.context.value && !json.attributes.value) {
      json.attributes.value = $el.context.value
    }

    const name = getSnapshotName(test, humanName)
    setSnapshot(name, json, $el, humanName)
    return $el
  }

  function isJqueryElement (x) {
    return 'wrap' in x
  }

  function snapshot (value, humanName) {
    console.log('human name', humanName)
    if (isJqueryElement(value)) {
      snapshot$(this.test, value, humanName)
    } else {
      setSnapshot(getSnapshotName(this.test, humanName), value, humanName)
    }
    // always just pass value
    return value
  }

  Cypress.Commands.add('snapshot', { prevSubject: true }, snapshot)

  global.after(() => {
    if (storeSnapshot) {
      cy.log('saving snapshots')
      const snapshots = storeSnapshot()
      console.log('snapshots on finish')
      console.log(snapshots)

      snapshots.__version = Cypress.version
      const s = JSON.stringify(snapshots, null, 2)
      const str = `module.exports = ${s}\n`
      cy.writeFile(SNAPSHOT_FILENAME, str, 'utf-8')
    }
  })
}

module.exports = registerCypressSnapshot
