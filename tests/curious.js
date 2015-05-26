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

  describe('#groupObjectsByID', function () {
    var objs;

    beforeEach(function () {
      objs = [
        {name: 'a', id: 1},
        {name: 'b', id: 2},
        {name: 'c', id: 3},
      ];
    });

    it('should return an object', function () {
      assert(curious.CuriousObjects.groupObjectsByID(objs) instanceof Object);
    });

    it('should contain all of the IDs', function () {
      assert.deepEqual(
        Object.keys(curious.CuriousObjects.groupObjectsByID(objs)).sort(),
        [1, 2, 3]
      );
    });

    it('should contain all of the objects', function () {
      assert.deepEqual(
        curious.CuriousObjects.values(curious.CuriousObjects.groupObjectsByID(objs)).sort(),
        objs.sort()
      );
    });

    it('should match the objects by their IDs', function () {
      var objsByID = curious.CuriousObjects.groupObjectsByID(objs);

      objs.forEach(function (obj) {
        assert.strictEqual(obj, objsByID[obj.id]);
      });
    });

    it('should maintain only complex references', function () {
      var objsByID = curious.CuriousObjects.groupObjectsByID(objs);

      // Simple reference
      objsByID[1] = 'moop'; // objs[0]
      // Complex reference
      objsByID[2].name = 'broop'; // objs[1]

      // Simple references do not change
      assert.strictEqual(JSON.stringify(objs[0]), JSON.stringify({name: 'a', id: 1}));
      // Complex references do change
      assert.strictEqual(JSON.stringify(objs[1]), JSON.stringify({name: 'broop', id: 2}));

    });

    it('should take the last object in the arary in case of duplicate IDs', function () {
      var objsByID;

      objs.push({name: 'b2', id: 2});
      objsByID = curious.CuriousObjects.groupObjectsByID(objs);

      assert.strictEqual(objsByID[2].name, 'b2');
    });

    it('should ignore objects without IDs', function () {
      var objsByID;
      var objsByIDWithNoID;

      objsByID = curious.CuriousObjects.groupObjectsByID(objs);

      objs.push({name: 'noID'});

      objsByIDWithNoID = curious.CuriousObjects.groupObjectsByID(objs);

      assert.deepEqual(objsByID, objsByIDWithNoID);
    });

  });

  describe('#idList', function () {
    var objs;

    beforeEach(function () {
      objs = [
        {name: 'a', id: 1},
        {name: 'b', id: 2},
        {name: 'c', id: 3},
      ];
    });

    it('should contain all of the IDs', function () {
      assert.deepEqual(
        curious.CuriousObjects.idList(objs).sort(),
        [1, 2, 3]
      );
    });

    it('should not contain duplicates', function () {
      objs.push({name: 'b2', id: 2});

      assert.deepEqual(
        curious.CuriousObjects.idList(objs).sort(),
        [1, 2, 3]
      );
    });

    it('should maintain the order of IDs and keep the first unique one', function () {

      // This object with id = 2 will be ignored, but the first one will be kept.
      objs.push({name: 'b2', id: 2});
      objs.push({name: 'd', id: 4});
      objs.push({name: 'e', id: 0});
      // This object with id = 2 will also be ignored
      objs.push({name: 'b3', id: 2});
      objs.push({name: 'f', id: 23});

      assert.deepEqual(
        curious.CuriousObjects.idList(objs),
        [1, 2, 3, 4, 0, 23]
      );
    });
  });

});
