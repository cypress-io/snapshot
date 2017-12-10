'use strict'

/* eslint-env mocha */
const snapshot = require('.')
const la = require('lazy-ass')
const is = require('check-more-types')

describe('@cypress/snapshot', () => {
  it('is a function', () => {
    la(is.fn(snapshot))
  })
})
