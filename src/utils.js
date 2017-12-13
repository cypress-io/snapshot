const sd = require('@wildpeaks/snapshot-dom')
const beautify = require('js-beautify').html

// converts DOM element to a JSON object
function serializeDomElement ($el) {
  // console.log('snapshot value!', $el)
  const json = sd.toJSON($el[0])
  // console.log('as json', json)

  // hmm, why is value not serialized?
  if ($el.context.value && !json.attributes.value) {
    json.attributes.value = $el.context.value
  }

  return deleteReactIdFromJson(json)
}

// remove React id, too transient
function deleteReactIdFromJson (json) {
  if (json.attributes) {
    delete json.attributes['data-reactid']
  }

  if (Array.isArray(json.childNodes)) {
    json.childNodes.forEach(deleteReactIdFromJson)
  }
  return json
}

const stripReactIdAttributes = (html) => {
  const dataReactId = /data\-reactid="[\.\d\$\-abcdfef]+"/g
  return html.replace(dataReactId, '')
}

const serializeReactToHTML = (el$) => {
  const html = el$[0].outerHTML
  const stripped = stripReactIdAttributes(html)
  const options = {
    wrap_line_length: 80,
    indent_inner_html: true,
    indent_size: 2,
    wrap_attributes: 'force'
  }
  const pretty = beautify(stripped, options)
  return pretty
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
  countSnapshots
}
