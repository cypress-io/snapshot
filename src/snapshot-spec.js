'use strict'

/* eslint-env mocha */
const api = require('.')
const la = require('lazy-ass')
const is = require('check-more-types')

describe('@cypress/snapshot', () => {
  it('is an object', () => {
    la(is.object(api))
  })

  it('has register', () => {
    la(is.fn(api.register))
  })
})
