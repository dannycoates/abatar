var util = require('./util')

function ExperimentIndex() {
  this.experimentsByName = {}
  this.experimentsByVariable = {}
  this.activeSubjectKeys = {}
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

ExperimentIndex.prototype.getLive = function (variable, now) {
  return this.getByVariable(variable).filter(
    function (x) {
      return x.isLive(now)
    }
  )
}

ExperimentIndex.prototype.getFirstMatch = function (variable, subject, now) {
  var self = this

  return this.getLive(variable, now).filter(
    function (x) {
      return self.activeSubjectKeys[x.key(subject)]
    }
  )[0]
}

/*/
  returns the first active experiment for the given variable and date,
  or undefined if none match
/*/
ExperimentIndex.prototype.getFirstLive = function (variable, now) {
  return this.getLive(variable, now)[0]
}

/*/
  returns the first experiment by startDate that doesn't conflict
  with any experiments the subject is already enrolled in and that the subject
  is eligible for, or undefined when none match
/*/
ExperimentIndex.prototype.getFirstEligible = function (variable, subject, enrolled, now) {
  subject = subject || {}
  enrolled = enrolled || new ExperimentIndex()
  function isEnrolled(name) { return !!enrolled.get(name, subject) }
  function noConflicts(x) {
    return Object.keys(x.conflictsWith).filter(isEnrolled).length === 0
  }

  var experiments = this.getByVariable(variable)

  for (var i = 0; i < experiments.length; i++) {
    var x = experiments[i]
    try {
      if (noConflicts(x) && x.isEligible(subject, now)) {
        return x
      }
    } catch (e) {/* next */}
  }
}

/*/
  returns the most recently released experiment determined by
  either the experiment.endDate or experiment.release.startDate,
  or undefined when none match
/*/
ExperimentIndex.prototype.getReleased = function (variable, now) {
  var released = this.getByVariable(variable).filter(
    function (x) {
      return x.isReleased(now)
    }
  ).sort(byReleaseDate) // the last one is most recent
  return released[released.length - 1]
}

/*/
  returns the experiment with the given `name` optionally filtered by `subject`
/*/
ExperimentIndex.prototype.get = function (name, subject) {
  var x = this.experimentsByName[name]
  if (subject && x && !this.activeSubjectKeys[x.key(subject)]) {
    return
  }
  return x
}

/*/
  adds an experiment to the index

  if an experiment already exists with the same name
  the new experiment is IGNORED

  if the experiement conflicts with any others they
  will be marked as being in conflict
/*/
ExperimentIndex.prototype.add = function (experiment, key) {
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
  if (key) {
    this.activeSubjectKeys[key] = true
  }
  return this
}

/*/
  returns an array of experiments which have been activated by the `choose`
  function
/*/
ExperimentIndex.prototype.active = function () {
  return this.filter(function (x) { return x.active })
}

ExperimentIndex.prototype.watching = function (event) {
  return this.filter(function (x) { return x.isWatching(event) })
}

ExperimentIndex.prototype.mark = function (event, data, subject, now) {
  this.watching(event).map(
    function (x) {
      return x.mark(event, data, subject, now)
    }
  )
}

/*/
  returns an array of report objects for the active experiments
/*/
ExperimentIndex.prototype.report = function () {
  return this.active().reduce(
    function (reports, x) {
      return reports.concat(x.report())
    },
    []
  )
}

ExperimentIndex.prototype.names = function () {
  return this.filter().map(function (x) { return x.name })
}

module.exports = ExperimentIndex
