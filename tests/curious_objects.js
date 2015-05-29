// mocha.js tests for functions dealing with Curious objects
(function () {
'use strict';

var expect = require('chai').expect;
var curious = require('../curious2.js');

// HELPER METHODS

/**
 * Generate sample data as would be returned by a Curious server in JSON.
 *
 * @return {Object} The response data
 */
function _sampleResponse() {

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  return {
    result: {
      computed_on: '2015-05-21 14:36:07.478769',
      last_model: 'Reaction',
      results: [
        {
          model: 'Experiment',
          join_index: -1,
          tree: null,
          objects: [
            [403, null],
          ],
        }, {
          model: 'Reaction',
          join_index: 0,
          tree: null,
          objects: [
            [23063, 403],
            [23064, 403],
            [23057, 403],
          ],
        },
      ],
      data: [
        { // Experiments
          fields: [
            'id',
            'created_by_id',
            'created_on',
            'updated_by_id',
            'updated_on',
            'assay_id',
            'name',
            'description',
            'completed',
            'ignore',
            'temperature',
          ],
          objects: [
            [
              403,
              22,
              '2015-01-16 14:54:13+00:00',
              22,
              '2015-05-14 16:03:13+00:00',
              1,
              'MS2 for x401 and x402',
              '',
              true,
              false,
              null,
            ],
          ],
          urls: [
            'http://example.com/experiment/403/'
          ],
        }, {
          fields: [
            'id',
            'created_by_id',
            'created_on',
            'updated_by_id',
            'updated_on',
            'experiment_id',
            'is_blank',
            'is_control',
            'notes',
            'sample_id',
          ],
          objects: [
            [
              23057,
              null,
              '2015-01-16 14:54:27+00:00',
              null,
              '2015-01-16 14:54:27+00:00',
              403,
              false,
              false,
              '',
              454565,
            ], [
              23063,
              null,
              '2015-01-16 14:54:27+00:00',
              null,
              '2015-01-16 14:54:27+00:00',
              403,
              true,
              false,
              '',
              null,
            ], [
              23064,
              null,
              '2015-01-16 14:54:27+00:00',
              null,
              '2015-01-16 14:54:27+00:00',
              403,
              true,
              false,
              '',
              null,
            ],
          ],
          urls: [
            'http://example.com/experiment/403/',
            'http://example.com/experiment/403/',
            'http://example.com/experiment/403/',
          ],
        },
      ],
    }
  };
  // jscs:enable
}

/**
 * Generate sample data as would be returned by a Curious server in JSON.
 *
 * @return {Object} The response data
 */
function _expectedObjects() {
  var exp;
  var rxns;

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  exp = {
    id: 403,
    created_by_id: 22,
    created_on: '2015-01-16 14:54:13+00:00',
    updated_by_id: 22,
    updated_on: '2015-05-14 16:03:13+00:00',
    assay_id: 1,
    name: 'MS2 for x401 and x402',
    description: '',
    completed: true,
    ignore: false,
    temperature: null,
    __url: 'http://example.com/experiment/403/',
    __model: 'Experiment',
    __dirty: false,
  };

  rxns = [
    {
      id: 23063,
      created_by_id: null,
      created_on: '2015-01-16 14:54:27+00:00',
      updated_by_id: null,
      updated_on: '2015-01-16 14:54:27+00:00',
      experiment_id: 403,
      is_blank: true,
      is_control: false,
      notes: '',
      sample_id: null,
      __url: 'http://example.com/experiment/403/',
      __model: 'Reaction',
      __dirty: false,
    }, {
      id: 23064,
      created_by_id: null,
      created_on: '2015-01-16 14:54:27+00:00',
      updated_by_id: null,
      updated_on: '2015-01-16 14:54:27+00:00',
      experiment_id: 403,
      is_blank: true,
      is_control: false,
      notes: '',
      sample_id: null,
      __url: 'http://example.com/experiment/403/',
      __model: 'Reaction',
      __dirty: false,
    }, {
      id: 23057,
      created_by_id: null,
      created_on: '2015-01-16 14:54:27+00:00',
      updated_by_id: null,
      updated_on: '2015-01-16 14:54:27+00:00',
      experiment_id: 403,
      is_blank: false,
      is_control: false,
      notes: '',
      sample_id: 454565,
      __url: 'http://example.com/experiment/403/',
      __model: 'Reaction',
      __dirty: false,
    },
  ];

  // Link foregin keys
  exp.reactions = rxns;
  rxns.forEach(function (rxn) { rxn.experiments = [exp]; });

  return {
    experiments: {
      403: exp
    },
    reactions: {
      23063: rxns[0],
      23064: rxns[1],
      23057: rxns[2],
    },
  };
  // jscs:enable
}

// TESTS

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
      expect(curious.CuriousObjects.values(obj)).to.have.deep.members(
        [obj.a, obj.b, obj.c, obj.d, obj.e]
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
      expect(curious.CuriousObjects.values(obj)).to.deep.equal(valuesInOrder);
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
      expect(obj.a).to.equal(1);
      // Complex references do change
      expect(obj.d['4']).to.equal('something');
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
      expect(curious.CuriousObjects.groupObjectsByID(objs)).to.be.an('object');
    });

    it('should contain all of the IDs', function () {
      expect(curious.CuriousObjects.groupObjectsByID(objs)).to.have.all.keys(
        {'1': objs[0], '2': objs[1], '3': objs[2]}
      );
    });

    it('should maintain only complex references', function () {
      var objsByID = curious.CuriousObjects.groupObjectsByID(objs);

      // Simple reference
      objsByID[1] = 'moop'; // objs[0]
      // Complex reference
      objsByID[2].name = 'broop'; // objs[1]

      // Simple references do not change
      expect(objs[0]).to.have.all.keys({name: 'a', id: 1});
      // Complex references do change
      expect(objs[1]).to.have.all.keys({name: 'broop', id: 2});
    });

    it('should take the last object in the arary in case of duplicate IDs', function () {
      var objsByID;

      objs.push({name: 'b2', id: 2});
      objsByID = curious.CuriousObjects.groupObjectsByID(objs);

      expect(objsByID[2]).to.have.property('name', 'b2');
    });

    it('should ignore objects without IDs', function () {
      var objsByID;
      var objsByIDWithNoID;

      objsByID = curious.CuriousObjects.groupObjectsByID(objs);

      objs.push({name: 'noID'});

      objsByIDWithNoID = curious.CuriousObjects.groupObjectsByID(objs);

      expect(objsByID).to.deep.equal(objsByIDWithNoID);
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
      expect(curious.CuriousObjects.idList(objs)).to.have.members([1, 2, 3]);
    });

    it('should not contain duplicates', function () {
      objs.push({name: 'b2', id: 2});

      expect(curious.CuriousObjects.idList(objs)).to.have.members([1, 2, 3]);
    });

    it('should maintain the order of IDs and keep the first unique one', function () {

      // This object with id = 2 will be ignored, but the first one will be kept.
      objs.push({name: 'b2', id: 2});
      objs.push({name: 'd', id: 4});
      objs.push({name: 'e', id: 0});
      // This object with id = 2 will also be ignored
      objs.push({name: 'b3', id: 2});
      objs.push({name: 'f', id: 23});

      expect(curious.CuriousObjects.idList(objs)).to.deep.equal([1, 2, 3, 4, 0, 23]);
    });
  });

  describe('#idString', function () {
    var objs;

    function _parseToNumbers(idString) {
      return idString.split(',').map(function (id) {return Number(id);});
    }

    beforeEach(function () {
      objs = [
        {name: 'a', id: 1},
        {name: 'b', id: 2},
        {name: 'c', id: 3},
      ];
    });

    it('should be equivalent to idList', function () {
      expect(_parseToNumbers(curious.CuriousObjects.idString(objs))).to.deep.equal(
        curious.CuriousObjects.idList(objs)
      );

      // This object with id = 2 will be ignored, but the first one will be kept.
      objs.push({name: 'b2', id: 2});
      objs.push({name: 'd', id: 4});
      objs.push({name: 'e', id: 0});
      // This object with id = 2 will also be ignored
      objs.push({name: 'b3', id: 2});
      objs.push({name: 'f', id: 23});

      expect(_parseToNumbers(curious.CuriousObjects.idString(objs))).to.deep.equal(
        curious.CuriousObjects.idList(objs)
      );
    });

    it('should not escape commas', function () {
      objs.push({name: 'commas', id: '4,5,6'});

      expect(
        // 1, 2, 3, 4, 5, 6, converted to numbers
        _parseToNumbers(curious.CuriousObjects.idString(objs))
      ).to.deep.equal(
        // Remove the element we added ('4,5,6') and add 4, 5, 6 to the end
        curious.CuriousObjects.idList(objs).slice(0, -1).concat([4, 5, 6])
      );
    });
  });

  describe('#parse', function () {
    var queryJSONResponse;

    beforeEach(function () {
      queryJSONResponse = _sampleResponse().result;
    });

    it('should correctly parse the output', function () {
      var expectedObjects = _expectedObjects();

      expect(curious.CuriousObjects.parse(
        ['experiments', 'reactions'],
        null,
        queryJSONResponse
      )).to.deep.equal(
        {
          trees: [null, null],
          objects: [
            expectedObjects.experiments,
            expectedObjects.reactions,
          ],
        }
      );
    });

    it('should construct objects correctly with custom constructors', function () {
      var constructors;
      var parsedData;

      // Fake constructors
      function Experiment() {
        // Do nothing
      }

      function Reaction() {
        // Do nothing
      }

      constructors = [Experiment, Reaction];

      parsedData = curious.CuriousObjects.parse(
        ['experiments', 'reactions'],
        constructors,
        queryJSONResponse
      );

      parsedData.objects.forEach(function (objectsByID, ix) {
        var objects = curious.CuriousObjects.values(objectsByID);

        objects.forEach(function (object) {
          expect(object).to.be.an.instanceof(constructors[ix]);
        });
      });

    });

    it('should combine new objects with existing ones', function () {
      var parsedData;
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      var existingObjects = [
        null,
        {
          23063: {
            id: 23063,
            created_by_id: 12345,
            created_on: 'another date',
            updated_by_id: 67890,
            updated_on: 'another time',
            experiment_id: 403,
            is_blank: false,
            is_control: false,
            notes: '',
            sample_id: 124816,
            __url: 'http://example.com/experiment/403/',
            __model: 'Reaction',
            __dirty: false,
          }
        },
      ];
      // jscs:enable

      parsedData = curious.CuriousObjects.parse(
        ['experiments', 'reactions'],
        null,
        queryJSONResponse,
        existingObjects
      );

      expect(parsedData.objects[1][23063]).to.contain.keys(existingObjects[1][23063]);
    });

  });
});

}());
