describe('@cypress/snapshot', () => {
  beforeEach(() => {
    cy.visit('https://example.cypress.io')
  })

  context('simple types', () => {
    it('works with objects', () => {
      cy.wrap({ foo: 42 }).snapshot()
    })

    it('works with numbers', () => {
      cy.wrap(42).snapshot()
    })

    it('works with strings', () => {
      cy.wrap('foo-bar').snapshot()
    })

    it('works with arrays', () => {
      cy.wrap([1, 2, 3]).snapshot()
    })
  })
})
