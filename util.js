function overwrite(x, y) {
  for (var n in y) { if (y.hasOwnProperty(n)) { x[n] = y[n] } }
}

function merge(x ,y) {
  var result = {}
  overwrite(result, x)
  overwrite(result, y)
  return result
}

function missingKeys(required, obj) {
  var requiredKeys = Object.keys(required)
  if (typeof(obj) !== 'object') { return requiredKeys }
  var missing = null
  for (var i = 0; i < requiredKeys.length; i++) {
    var key = requiredKeys[i]
    if (!obj.hasOwnProperty(key)) {
      missing = missing || []
      missing.push(key)
    }
  }
  return missing
}

module.exports = {
  overwrite: overwrite,
  merge: merge,
  missingKeys: missingKeys
}
