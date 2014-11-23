var Experiment = require('./experiment')


function AB() {
  this.experiments = {}
}

AB.Experiment = Experiment

AB.create = function (experiments) {
  var ab = new AB()
  ab.add(experiments)
  return ab
}

AB.prototype.add = function (experiments) {
  if (Array.isArray(experiments)) {
    for (var i = 0; i < experiments.length; i++) {
      var exp = experiments[i]
      this.experiments[exp.name] = exp
    }
  }
  else {
    this.experiments[experiments.name] = experiments
  }
}

AB.prototype.choose = function () {
  var name = arguments[0]
  var args = Array.prototype.slice.call(arguments, 1)
  var exp = this.experiments[name]
  if (!exp) {
    var options = args[args.length - 1]
    if (typeof(options) === 'object') {
      return options.default
    }
    return null
  }
  return exp.choose.apply(exp, args)
}

AB.prototype.isEnabled = function () {
  return !!this.choose.apply(this, arguments)
}

AB.prototype.report = function () {
  var names = Object.keys(this.experiments)
  var report = {}
  for (var i = 0; i < names.length; i++) {
    var name = names[i]
    var exp = this.experiments[name]
    if (exp.active) {
      report[name] = exp.report()
    }
  }
  return report
}

module.exports = AB
