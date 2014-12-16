var Experiment = require('./experiment')
var ExperimentIndex = require('./experiment_index')
var util = require('./util')

function AB() {
  this.experiments = new ExperimentIndex()
  this.enrolled = new ExperimentIndex()
  this.subject = {}
}

AB.Experiment = Experiment

AB.create = function (experiments, enrolled, now) {
  if (!Array.isArray(experiments)) { throw new Error('create only accepts an array') }
  enrolled = enrolled || []
  now = now || Date.now()

  var ab = new AB()
  for (var i = 0; i < experiments.length; i++) {
    ab.add(new Experiment(experiments[i]))
  }
  for (var i = 0; i < enrolled.length; i++) {
    ab.enroll(ab.experiments.get(enrolled[i]))
  }
  return ab
}

AB.prototype.add = function (experiment) {
  this.experiments.add(experiment)
  return this
}

AB.prototype.enroll = function (experiment, now) {
  if (!experiment) { return this }
  now = now || Date.now()
  if (experiment.live(now)) {
    this.enrolled.add(experiment)
  }
  return this
}

/*/
  returns a value for the requested `variable` or `undefined` when no experiments
  can set it, in which case the app should use it's own default value.

  ## Experiment priority

  1. enrolled experiments that are live
  2. eligible experiments not conflicting with any enrolled experiments
  3. released experiments

/*/
AB.prototype.choose = function (variable, subject, now) {
  now = now || Date.now()
  var s = util.merge(this.subject, subject)
  var x = this.enrolled.getFirstLive(variable, now) ||
          this.experiments.getFirstEligible(variable, s, this.enrolled, now) ||
          this.experiments.getReleased(variable, now)
  var output = x && x.choose(s, now)
  this.enroll(x, now)
  if (typeof(output) === 'object' && output.hasOwnProperty(variable)) {
    return output[variable]
  }
  return output
}

AB.prototype.variables = function () {
  return this.experiments.variables()
}

AB.prototype.report = function () {
  return this.enrolled.report()
}

module.exports = AB
