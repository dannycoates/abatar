var test = require('tape')
var Experiment = require('../experiment')
var ExperimentIndex = require('../experiment_index')

test(
  'an experiment can be retrieved by name',
  function (t) {
    var x = new Experiment(
      {
        name: 'foo'
      }
    )
    var index = new ExperimentIndex()
    index.add(x)
    t.equal(index.get('foo'), x, 'got experiment by name')
    t.end()
  }
)

test(
  'an experiment can be retrieved by variable',
  function (t) {
    var x = new Experiment(
      {
        name: 'foo',
        independentVariables: ['bar']
      }
    )
    var index = new ExperimentIndex()
    index.add(x)
    t.equal(index.getByVariable('bar')[0], x, 'got experiment by variable')
    t.end()
  }
)

test(
  'mutiple experiments can have the same independentVariables',
  function (t) {
    var x1 = new Experiment(
      {
        name: 'foo',
        independentVariables: ['bar']
      }
    )
    var x2 = new Experiment(
      {
        name: 'baz',
        independentVariables: ['bar']
      }
    )
    var index = new ExperimentIndex()
    index.add(x1).add(x2)
    t.equal(index.getByVariable('bar').length, 2, 'got 2 experiments by variable')
    t.end()
  }
)

test(
  'mutiple experiments can not have the same name',
  function (t) {
    var x1 = new Experiment(
      {
        name: 'foo',
        independentVariables: ['bar']
      }
    )
    var x2 = new Experiment(
      {
        name: 'foo',
        independentVariables: ['bar']
      }
    )
    var index = new ExperimentIndex()
    index.add(x1).add(x2)
    t.equal(index.filter().length, 1, 'only one experiment')
    t.equal(index.get('foo'), x1, 'the first experiment remains')
    t.end()
  }
)

test(
  'only active experiments are represented in report',
  function (t) {
    var x1 = new Experiment(
      {
        name: 'foo',
        independentVariables: ['bar'],
        groupingFunction: function () { return { bar: 'x' }}
      }
    )
    x1.active = true
    var x2 = new Experiment(
      {
        name: 'baz',
        independentVariables: ['bar']
      }
    )
    var index = new ExperimentIndex()
    index.add(x1).add(x2)
    x1.choose('bar')
    var report = index.report()
    t.equal(report.length, 1, 'correct number of reports')
    t.equal(report[0].experiment, 'foo', 'correct experiment reported')
    t.end()
  }
)

test(
  'add sorts experiments by startDate',
  function (t) {
    var x1 = new Experiment(
      {
        name: 'foo',
        startDate: '2014-01-01',
        independentVariables: ['bar']
      }
    )
    var x2 = new Experiment(
      {
        name: 'baz',
        startDate: '2013-01-01',
        independentVariables: ['bar']
      }
    )
    var x3 = new Experiment(
      {
        name: 'bae',
        startDate: '2014-01-02',
        independentVariables: ['bar']
      }
    )
    var index = new ExperimentIndex()
    index.add(x1).add(x2).add(x3)
    t.equal(index.getByVariable('bar')[0].startDate, Date.parse('2013-01-01'), 'experiments are sorted')
    t.end()
  }
)

test(
  'firstEligible is the eligible experiment with the earliest start date',
  function (t) {
    var x1 = new Experiment(
      {
        name: 'foo',
        startDate: '2014-01-01',
        independentVariables: ['bar'],
        eligibilityFunction: function () { return true }
      }
    )
    var x2 = new Experiment(
      {
        name: 'baz',
        startDate: '2013-01-01',
        independentVariables: ['bar']
      }
    )
    var firstEligible = new Experiment(
      {
        name: 'boz',
        startDate: '2013-12-31',
        independentVariables: ['bar'],
        eligibilityFunction: function () { return true }
      }
    )
    var index = new ExperimentIndex()
    index.add(x1).add(x2).add(firstEligible)
    t.equal(index.getFirstEligible('bar'), firstEligible, 'got most eligible')
    t.end()
  }
)

test(
  'conflicting experiments yield to previously enrolled experiments',
  function (t) {
    var x = new Experiment(
      {
        name: 'X',
        startDate: '2014-01-01',
        endDate: '2014-02-01',
        independentVariables: {
          a: 1,
          b: 2
        },
        eligibilityFunction: function () { return true }
      }
    )
    // Y conflicts with X on 'b' so if a subject is eligible for both X takes
    // precedence over the union of their variables
    var y = new Experiment(
      {
        name: 'Y',
        startDate: '2014-01-02',
        endDate: '2014-02-02',
        independentVariables: {
          b: 3,
          c: 4
        },
        eligibilityFunction: function () { return true }
      }
    )
    var z = new Experiment(
      {
        name: 'Z',
        startDate: '2014-01-03',
        endDate: '2014-02-03',
        independentVariables: {
          c: 5
        },
        eligibilityFunction: function () { return true }
      }
    )
    var t0 = Date.parse('2014-01-01')
    var t1 = Date.parse('2014-01-02')
    var t2 = Date.parse('2014-01-03')
    var index = new ExperimentIndex()
    index.add(x).add(y).add(z)
    var enrolled = new ExperimentIndex()
    t.equal(index.getFirstEligible('b', {}, enrolled, t0), x, 'initial experiment')
    enrolled.add(x) // enroll in experiment X
    t.equal(index.getFirstEligible('b', {}, enrolled, t2), x, 'consistent with enrollment')
    t.equal(index.getFirstEligible('c', {}, enrolled, t1), undefined, 'Y conflicts with X')
    t.equal(index.getFirstEligible('c', {}, enrolled, t2), z, 'Z does not conflict with X')
    t.end()
  }
)

test(
  'getReleased returns the most recently released experiment',
  function (t) {
    var x1 = new Experiment(
      {
        name: 'foo',
        endDate: '2014-01-01',
        independentVariables: ['bar']
      }
    )
    var x2 = new Experiment(
      {
        name: 'baz',
        endDate: '2014-12-31',
        independentVariables: ['bar']
      }
    )
    var x3 = new Experiment(
      {
        name: 'bae',
        endDate: '2014-06-01',
        independentVariables: ['bar']
      }
    )
    var index = new ExperimentIndex()
    index.add(x1).add(x2).add(x3)
    var now = Date.parse('2014-12-30')
    t.equal(index.getReleased('bar', now), x3, 'pre-x2 release')
    now = Date.parse('2015-01-01')
    t.equal(index.getReleased('bar', now), x2, 'post-x2 release')
    t.end()
  }
)

test(
  'getReleased returns undefined when no experiments are released',
  function (t) {
    var x1 = new Experiment(
      {
        name: 'foo',
        independentVariables: ['bar']
      }
    )
    var x2 = new Experiment(
      {
        name: 'baz',
        independentVariables: ['bar']
      }
    )
    var index = new ExperimentIndex()
    index.add(x1).add(x2)
    now = Date.parse('2015-01-01')
    t.equal(index.getReleased('bar', now), undefined, 'no releases')
    t.end()
  }
)
