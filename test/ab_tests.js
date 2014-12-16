var test = require('tape')
var AB = require('../')

test(
  'choose',
  function (t) {
    var ab = AB.create([
      {
        name: 'foo',
        independentVariables: {
          x: 1
        },
        eligibilityFunction: function () { return true },
        groupingFunction: function () { return { x: 2 } }
      }
    ])
    t.equal(ab.choose('x'), 2, 'choice came from groupingFunction')
    t.end()
  }
)
