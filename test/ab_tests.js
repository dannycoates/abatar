var test = require('tape')
var AB = require('../')

test(
  'choose',
  function (t) {
    var ab = AB.create({
      experiments: [
        {
          name: 'foo',
          startDate: (new Date()).toISOString(),
          independentVariables: ['x'],
          eligibilityFunction: function () { return true },
          groupingFunction: function () { return { x: 2 } }
        }
      ]})
    t.equal(ab.choose('x'), 2, 'choice came from groupingFunction')
    t.end()
  }
)

test(
  'choose returns the default when no experiment sets the variable',
  function (t) {
    var ab = AB.create({
      experiments: [{
        name: 'foo',
        startDate: (new Date()).toISOString(),
        independentVariables: ['x'],
        eligibilityFunction: function () { return true },
        groupingFunction: function () { return { x: 2 } }
      }],
      defaults: {
        z: 1
      }
    })
    t.equal(ab.choose('z'), 1, 'choice came from defaults')
    t.end()
  }
)

test(
  'ab.now is relative to remoteNow',
  function (t) {
    var now = Date.now()
    var remoteNow = (new Date('2015-01-01')).valueOf()
    var ab = AB.create({
      remoteNow: remoteNow,
      localNow: now
    })
    var d = ab.now() - remoteNow
    t.ok(d < 10 && d >= 0, 'close enough')
    t.end()
  }
)
