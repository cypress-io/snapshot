// register .snapshot() command
require('../..').register()

// merge Cypress interface with new command "snapshot()"
declare namespace Cypress {
  interface Chainable {
    snapshot(): void
  }
}
