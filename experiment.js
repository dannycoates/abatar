var sha1 = require('sha1')
var util = require('./util')

function Experiment(spec) {
  this.name = spec.name
  this.release = parseRelease(spec.release)
  this.startDate = Date.parse(spec.startDate || '3000-01-01')
  this.endDate = this.release ? this.release.endDate : Date.parse(spec.endDate || '3000-01-01')
  this.conclusion = spec.conclusion
  this.active = false
  this.choices = {}
  this.conflictsWith = {}
  this.groupingFunction = spec.groupingFunction || function () { return {} }
  this.eligibilityFunction = spec.eligibilityFunction || function () { return false }
  this.subjectAttributes = parseArrayOrObject(spec.subjectAttributes)
  this.independentVariables = parseArrayOrObject(spec.independentVariables)
}

/*/
  allow either an array of property names or an object to be used for
  `subjectAttributes` and `independentVariables`
/*/
function parseArrayOrObject(it) {
  if (Array.isArray(it)) {
    var result = {}
    for (var i = 0; i < it.length; i++) {
      result[it[0]] = true
    }
    return result
  }
  return it || {}
}

function parseRelease(release) {
  if (!release || !release.startDate || !release.endDate) { return null }
  return {
    startDate: Date.parse(release.startDate),
    endDate: Date.parse(release.endDate)
  }
}

function throwIfMissing(required, checkme, message) {
  var missing = util.missingKeys(required, checkme)
  if (missing) {
    throw new Error(message + ' : ' + missing.join())
  }
}

Experiment.prototype.attributes = function () {
  return Object.keys(this.subjectAttributes)
}

/*/
  returns a unique sha1 for this experiment and `subject`

  useful for uniquely identifying a subject in an experiment
  without exposing all of the subject attributes themselves
/*/
Experiment.prototype.key = function (subject) {
  var attributes = this.attributes()
  var keyParts = [this.name]
  for (var i = 0; i < attributes.length; i++) {
    keyParts.push(attributes[i])
    keyParts.push(subject[attributes[i]])
  }
  return sha1(keyParts.join(':'))
}

/*/
  a "live" experiment is one where `now` falls between the startDate
  and endDate.
/*/
Experiment.prototype.live = function (now) {
  now = now || Date.now()
  return now >= this.startDate && now <= this.endDate
}

/*/
  returns a number representing the release completion ratio.
  if the result is > 1 the release has already finished
  if the result is < 0 the release hasn't started yet
  if the result is > 0 and < 1 the release is in progress
/*/
Experiment.prototype.releaseProgress = function (now) {
  now = now || Date.now()
  var r = this.release
  if (!r) { return 0 }
  return (now - r.startDate) / (r.endDate - r.startDate)
}

/*/
  mark this experiment to be in conflict with the given `experiments`
  and also mark them to be in conflict with this

  conflicts arise when multiple experiments set the same variables
/*/
Experiment.prototype.setConflict = function (experiments) {
  for (var i = 0; i < experiments.length; i++) {
    var x = experiments[i]
    this.conflictsWith[x.name] = true
    x.conflictsWith[this.name] = true
  }
}

/*/
  hashes the given `key` (as a string) to an integer, "salted" with the
  experiment name
/*/
Experiment.prototype.hash = function (key) {
  // we want as large an integer as we can get
  // and we can easily get 52bits worth (13 chars)
  // sha1's are 40 chars so 40 - 13 = 27
  return parseInt(sha1(this.name + ':' + key).substring(27), 16)
}

/*/
  returns a number between 0 and 1 that is unique to the `key` and this
  experiment
/*/
Experiment.prototype.luckyNumber = function(key) {
  return this.hash(key) / 0xFFFFFFFFFFFFF
}

/*/
  returns a number between `min` and `max` that is unique to the `key` and this
  experiment
/*/
Experiment.prototype.randomDouble = function (key, min, max) {
  min = min || 0
  max = (max === 0) ? 0 : (max || 1)
  return min + (max - min) * this.luckyNumber(key)
}

/*/
  returns an integer between `min` and `max` that is unique to the `key` and
  this experiment
/*/
Experiment.prototype.randomInt = function (key, min, max) {
  min = min || 0
  max = (max === 0) ? 0 : (max || 1)
  return min + (this.hash(key) % (max - min + 1))
}

/*/
  returns a boolean that will be true for approximately `percent` of `key`s
  and consistent for any given `key`
/*/
Experiment.prototype.bernoulliTrial = function (percent, key) {
  return this.luckyNumber(key) <= percent
}

/*/
  returns one of the `choices` that will be evenly distributed across many
  `key`s and consistent for any given `key`
/*/
Experiment.prototype.uniformChoice = function (choices, key) {
  return choices[this.hash(key) % choices.length]
}

Experiment.prototype.eligible = function (subject, now) {
  return this.live(now || Date.now()) &&
         !util.missingKeys(this.subjectAttributes, subject) &&
         this.eligibilityFunction(subject)
}

Experiment.prototype.choose = function (subject, now) {
  now = now || Date.now()
  if (this.release) {
    return this.chooseRelease(subject, now)
  }
  else if (now > this.endDate){
    return this.conclusion
  }
  return this.chooseGrouping(subject, now)
}

Experiment.prototype.chooseRelease = function (subject, now) {
  now = now || Date.now()
  var experimental = this.chooseGrouping(subject, now)
  var rank = this.luckyNumber(this.key(subject))
  return (rank <= this.releaseProgress(now)) ? this.conclusion : experimental
}

Experiment.prototype.chooseGrouping = function (subject, now) {
  // TODO probably return undefined instead of throwing
  throwIfMissing(this.subjectAttributes, subject, 'groupingFunction requires')

  var choice = this.groupingFunction(subject)

  throwIfMissing(this.independentVariables, choice, 'groupingFunction must return')
  this.active = true
  this.choices[this.key(subject)] = choice
  return choice
}

Experiment.prototype.report = function () {
  return { name: this.name, choices: this.choices }
}

module.exports = Experiment
