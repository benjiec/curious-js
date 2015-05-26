// mocha.js tests for the functions in Curious

var assert = require('assert');
var curious = require('../curious2.js');

describe('CuriousObjects', function () {
  describe('#values', function () {
    var obj;

    beforeEach(function () {
      obj = {
        a: 1,
        b: 'two',
        c: ['3'],
        d: {'4': true},
        e: function () { return 5; },
      };
    });

    it('should return all of the values of an object', function () {
      assert.deepEqual(
        curious.CuriousObjects.values(obj).sort(),
        [obj.a, obj.b, obj.c, obj.d, obj.e].sort()
      );
    });

    it('should return values in the same order as "for-in"', function () {
      var key;
      var valuesInOrder = [];

      for (key in obj) {
        if (obj.hasOwnProperty(key)) {
          valuesInOrder.push(obj[key]);
        }
      }
      assert.deepEqual(curious.CuriousObjects.values(obj), valuesInOrder);
    });

    it('should maintain only complex references', function () {
      var vals = curious.CuriousObjects.values(obj);

      vals.forEach(function (value, ix) {
        // Simple reference
        if (value === 1) {
          // Use vals[ix] instead of value here to make sure we mutate vals
          // and not a shallow copy
          vals[ix] = 'moop';
        }

        // Complex reference
        if (JSON.stringify(value) === JSON.stringify({'4': true})) {
          vals[ix][4] = 'something';
        }
      });

      // Simple references do not change
      assert.strictEqual(obj.a, 1);
      // Complex references do change
      assert.strictEqual(obj.d['4'], 'something');
    });
  });
});
