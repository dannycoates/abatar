var util = require('./util')

function ExperimentIndex() {
  this.experimentsByName = {}
	this.experimentsByVariable = {}
}

// sort
function byStartDate(a, b) {
  var x = a.startDate - b.startDate
  return x !== 0 ? x : a.hash() - b.hash() // break ties with hash()
}

// sort
function byReleaseDate(a, b) {
  var ad = a.endDate || (a.release && a.release.startDate) || 0
  var bd = b.endDate || (b.release && b.release.startDate) || 0
  var x = ad - bd
  return x !== 0 ? x : a.hash() - b.hash()
}

// mostly internal. returns an array of experiments that match the filterFn
ExperimentIndex.prototype.filter = function (filterFn) {
  filterFn = filterFn || function () { return true }
  var names = Object.keys(this.experimentsByName)
  var results = []
  for (var i = 0; i < names.length; i++) {
    var x = this.experimentsByName[names[i]]
    if (filterFn(x)) { results.push(x) }
  }
  return results
}

ExperimentIndex.prototype.attributes = function () {
  var experiments = this.filter()
  var attributes = {}
  for (var i = 0; i < experiments.length; i++) {
    var x = experiments[i]
    var xa = x.attributes()
    for (var j = 0; j < xa.length; j++) {
      attributes[xa[j]] = true
    }
  }
  return Object.keys(attributes)
}

/*/
  returns an array of all the variable names set by experiments
/*/
ExperimentIndex.prototype.variables = function () {
  return Object.keys(this.experimentsByVariable)
}

/*/
  returns an array of experiments that set the given variable
/*/
ExperimentIndex.prototype.getByVariable = function (variable) {
	return this.experimentsByVariable[variable] || []
}

/*/
  returns the first active experiment for the given variable and date,
  or undefined if none match
/*/
ExperimentIndex.prototype.getFirstLive = function (variable, now) {
  now = now || Date.now()
  var experiments = this.getByVariable(variable)
  for (var i = 0; i < experiments.length; i++) {
    if (experiments[i].live(now)) {
      return experiments[i]
    }
  }
}

/*/
  returns the first experiment by startDate that doesn't conflict
  with any experiments the subject is already enrolled in and that the subject
  is eligible for, or undefined when none match
/*/
ExperimentIndex.prototype.getFirstEligible = function (variable, subject, enrolled, now) {
  subject = subject || {}
  enrolled = enrolled || new ExperimentIndex()
  function isEnrolled(name) { return !!enrolled.get(name) }
  function noConflicts(x) {
    return Object.keys(x.conflictsWith).filter(isEnrolled).length === 0
  }

  var experiments = this.getByVariable(variable)

  for (var i = 0; i < experiments.length; i++) {
    var x = experiments[i]
    if (noConflicts(x) && x.eligible(subject, now)) {
      return x
    }
  }
}

/*/
  returns the most recently released experiment determined by
  either the experiment.endDate or experiment.release.startDate,
  or undefined when none match
/*/
ExperimentIndex.prototype.getReleased = function (variable, now) {
  now = now || Date.now()
  var released = this.getByVariable(variable).filter(
    function (x) {
      return x.endDate < now || (x.release && x.release.startDate < now)
    }
  )
  released.sort(byReleaseDate) // the last one is most recent
  return released[released.length - 1]
}

/*/
  returns the experiment with the given `name`
/*/
ExperimentIndex.prototype.get = function (name) {
  return this.experimentsByName[name]
}

/*/
  adds an experiment to the index

  if an experiment already exists with the same name
  the new experiment is IGNORED

  if the experiement conflicts with any others they
  will be marked as being in conflict
/*/
ExperimentIndex.prototype.add = function (experiment) {
  if (!experiment || this.get(experiment.name)) {
    return this
  }
  var variables = Object.keys(experiment.independentVariables)
  for (var i = 0; i < variables.length; i++) {
    var variable = variables[i]
    var experiments = this.getByVariable(variable)
    experiment.setConflict(experiments)
    experiments.push(experiment)
    experiments.sort(byStartDate)
    this.experimentsByVariable[variable] = experiments
  }
  this.experimentsByName[experiment.name] = experiment
  return this
}

/*/
  returns an array of experiments which have been activated by the `choose`
  function
/*/
ExperimentIndex.prototype.active = function () {
  return this.filter(function (x) { return x.active })
}

/*/
  returns an array of report objects for the active experiments
/*/
ExperimentIndex.prototype.report = function () {
  return this.active().map(function (x) { return x.report() })
}

ExperimentIndex.prototype.names = function () {
  return this.filter().map(function (x) {return x.name })
}

module.exports = ExperimentIndex
