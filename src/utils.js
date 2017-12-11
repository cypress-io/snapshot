const sd = require('@wildpeaks/snapshot-dom')
const beautify = require('js-beautify').html

function isJqueryElement (x) {
  // had to work around "switchcase" bug
  function isObject (x) {
    return x instanceof Object
  }
  return x && isObject(x) && 'wrap' in x
}

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
  countSnapshots,
  isJqueryElement
}
