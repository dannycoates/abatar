var sha1 = require('sha1')
var format = require('util').format

function Experiment(name, chooseFn) {
  this.name = name
  this.logLines = []
  this.active = false
  this.choice = null
  this.chooseFn = chooseFn
}

Experiment.create = function (name, chooseFn) {
  return new Experiment(name, chooseFn)
}

Experiment.prototype.hash = function (key) {
  // we want as large an integer as we can get
  // and we can easily get 52bits worth (13 chars)
  // sha1's are 40 chars so 40 - 13 = 27
  return parseInt(sha1(this.name + ':' + key).substring(27), 16)
}

Experiment.prototype.luckyNumber = function(key) {
  return this.hash(key) / 0xFFFFFFFFFFFFF // number between 0 and 1
}

Experiment.prototype.randomDouble = function (key, min, max) {
  min = min || 0
  max = (max === 0) ? 0 : (max || 1)
  return min + (max - min) * this.luckyNumber(key)
}

Experiment.prototype.randomInt = function (key, min, max) {
  min = min || 0
  max = (max === 0) ? 0 : (max || 1)
  return min + (this.hash(key) % (max - min + 1))
}

Experiment.prototype.bernoulliTrial = function (percent, key) {
  return this.luckyNumber(key) <= percent
}

Experiment.prototype.uniformChoice = function (choices, key) {
  return choices[this.hash(key) % choices.length]
}

Experiment.prototype.choose = function (subject) {
  this.active = true
  if (this.hasOwnProperty('force')) {
    this.choice = this.force
  }
  else {
    this.choice = this.chooseFn(subject)
  }
  return this.choice
}

Experiment.prototype.log = function () {
  this.logLines.push(format.apply(null, arguments))
}

Experiment.prototype.report = function () {
  return { name: this.name, choice: this.choice, log: this.logLines }
}

module.exports = Experiment
