var Experiment = require('./experiment')
var ExperimentIndex = require('./experimentIndex')

function AB() {
  this.experiments = {}
  this.experimentsByVariable = new ExperimentIndex()
  this.subject = {}
}

AB.Experiment = Experiment

function overwrite(x, y) {
  for (var n in y) { if (y.hasOwnProperty(n)) { x[n] = y[n] } }
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
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    ab.add(new Experiment(name, experiments[name]))
  }
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

AB.prototype.add = function (experiment) {
  for (var j = 0; j < experiment.outputs.length; j++) {
    this.experimentsByVariable.add(experiment.outputs[j], experiment)
  }
  this.experiments[experiment.name] = experiment
}

AB.prototype.choose = function (variable, subject) {
  var x = this.experimentsByVariable.get(variable)
  var output = x && x.choose(merge(this.subject, subject))
  if (typeof(output) === 'object' && output.hasOwnProperty(variable)) {
    return output[variable]
  }
  return output
}

AB.prototype.report = function () {
  return this.filter(function (x) { return x.active })
             .map(function (x) { return x.report() })
}

module.exports = AB
