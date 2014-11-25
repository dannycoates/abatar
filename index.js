var Experiment = require('./experiment')

function AB() {
  this.experiments = {}
  this.subject = {}
}

AB.Experiment = Experiment

function overwrite(x, y) {
  for (var n in y) {
    if (y.hasOwnProperty(n)) { x[n] = y[n] }
  }
}

function merge(x ,y) {
  var result = {}
  overwrite(result, x)
  overwrite(result, y)
  return result
}

AB.create = function (experiments) {
  var ab = new AB()
  var names = Object.keys(experiments)
  ab.add(
    names.map(
      function (n) {
        return new Experiment(n, experiments[n])
      }
    )
  )
  return ab
}

AB.prototype.filter = function (filterFn) {
  filterFn = filterFn || function () { return true }
  var names = Object.keys(this.experiments)
  var results = []
  for (var i = 0; i < names.length; i++) {
    var x = this.experiments[names[i]]
    if (filterFn(x)) { results.push(x) }
  }
  return results
}

AB.prototype.add = function (experiments) {
  if (Array.isArray(experiments)) {
    for (var i = 0; i < experiments.length; i++) {
      var x = experiments[i]
      this.experiments[x.name] = x
    }
  }
  else {
    this.experiments[experiments.name] = experiments
  }
}

AB.prototype.choose = function (name, subject) {
  var x = this.experiments[name]
  if (!x) {
    return undefined
  }
  return x.choose(merge(this.subject, subject))
}

AB.prototype.isEnabled = function (name, subject) {
  return this.experiments.hasOwnProperty(name) &&
   this.choose(name, subject) !== false
}

AB.prototype.report = function () {
  return this.filter(function (x) { return x.active })
    .map(function (x) { return x.report() })
}

module.exports = AB
