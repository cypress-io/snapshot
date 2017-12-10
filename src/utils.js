/* global Cypress */
const sd = require('@wildpeaks/snapshot-dom')

// converts DOM element to a JSON object
function serializeDomElement ($el) {
  // console.log('snapshot value!', $el)
  const json = sd.toJSON($el.context)
  // remove React id, too transient
  delete json.attributes['data-reactid']
  // console.log('as json', json)

  // hmm, why is value not serialized?
  if ($el.context.value && !json.attributes.value) {
    json.attributes.value = $el.context.value
  }

  return json
}

const stripAttribute = (attribute) => (el$) => {
  el$.removeAttr(attribute)
  el$.children().each(stripAttribute(attribute))
  return el$
}

const serializeReactToHTML = (el$) => {
  const copy$ = Cypress.$(el$.outerHTML)
  const removedReactId = stripAttribute('data-reactid')(copy$)
  return removedReactId.html()
}

const identity = (x) => x

const publicProps = (name) => !name.startsWith('__')

const countSnapshots = (snapshots) =>
  Object.keys(snapshots).filter(publicProps).length

module.exports = {
  SNAPSHOT_FILE_NAME: 'snapshots.js',
  serializeDomElement,
  serializeReactToHTML,
  identity,
  countSnapshots,
  stripAttribute
}
