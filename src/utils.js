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

  return deleteTransientIdsFromJson(json)
}

// remove React and Angular ids, which are transient
function deleteTransientIdsFromJson(json) {
  if (json.attributes) {
    delete json.attributes['data-reactid']

    Object.keys(json.attributes)
      .filter(key => key.startsWith('_ng'))
      .forEach(attr => delete json.attributes[attr])
    delete json.attributes['']
  }

  if (Array.isArray(json.childNodes)) {
    json.childNodes.forEach(deleteTransientIdsFromJson)
  }
  return json
}

const stripTransientIdAttributes = (html) => {
  const dataReactId = /data\-reactid="[\.\d\$\-abcdfef]+"/g
  const angularId = /_ng(content|host)\-[0-9a-z-]+(="")?/g
  return html.replace(dataReactId, '')
    .replace(angularId, '')
}

const serializeToHTML = (el$) => {
  const html = el$[0].outerHTML
  const stripped = stripTransientIdAttributes(html)
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
  serializeToHTML,
  identity,
  countSnapshots
}
