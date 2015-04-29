var Experiment = require('./experiment')
var ExperimentIndex = require('./experiment_index')
var util = require('./util')

function AB(options) {
  var experiments = options.experiments || []
  var enrolled = options.enrolled || {}

  this.defaults = options.defaults || {}
  this.enrolled = new ExperimentIndex()
  this.experiments = new ExperimentIndex()
  this.localNow = options.localNow || Date.now()
  this.remoteNow = options.remoteNow || this.localNow
  this.subject = options.subject || {}

  for (var i = 0; i < experiments.length; i++) {
    var x = experiments[i]
    x.defaults = this.defaults
    this.experiments.add(new Experiment(x))
  }
  var keys = Object.keys(enrolled)
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i]
    var x = enrolled[key]
    this.enroll(this.experiments.get(x), key)
  }
}

AB.Experiment = Experiment

AB.create = function (options) {
  return new AB(options)
}

AB.prototype.now = function () {
  var delta = this.remoteNow - this.localNow
  return Date.now() + delta
}

AB.prototype.add = function (experiment) {
  this.experiments.add(experiment)
  return this
}

AB.prototype.enroll = function (experiment, subject, now) {
  now = now || this.now()
  if (typeof(experiment) === 'string') {
    experiment = this.experiments.get(experiment)
  }
  if (!experiment) { return this }
  if (experiment.isLive(now)) {
    this.enrolled.add(experiment, experiment.key(subject))
  }
  return this
}

/*/
  returns a value for the requested `variable` or the default value set
  in `this.defaults`

  ## Experiment priority

  1. enrolled experiments that are live
  2. eligible experiments not conflicting with any enrolled experiments
  3. released experiments

  If the chosen experiment can't choose the variable it will throw an Error. The
  subject will not be enrolled and the default value returned.

/*/
AB.prototype.choose = function (variable, subject, now) {
  now = now || this.now()
  var value = this.defaults[variable]
  var s = util.merge(this.subject, subject)
  var x = this.enrolled.getFirstMatch(variable, s, now) ||
          this.experiments.getFirstEligible(variable, s, this.enrolled, now) ||
          this.experiments.getReleased(variable, now)
  if (x) {
    try {
      value = x.choose(s, now)[variable]
      this.enroll(x, s, now)
    } catch (e) {}
  }
  return value
}

AB.prototype.mark = function (event, data, subject) {
  return this.enrolled.mark(event, data || {}, util.merge(this.subject, subject), this.now())
}

AB.prototype.attributes = function () {
  return this.experiments.attributes()
}

AB.prototype.variables = function () {
  return this.experiments.variables()
}

AB.prototype.report = function () {
  return this.enrolled.report()
}

module.exports = AB
