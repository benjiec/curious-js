// mocha.js tests for the functions dealing with Curious queries
(function () {
'use strict';

var expect = require('chai').expect;
var curious = require('../curious2.js');

describe('CuriousQuery', function () {
  describe('#query', function () {
    var expectedQuery = (
      'Experiment(id=302), Experiment.reaction_set, '
       + 'Reaction.dataset_set, Dataset.attachment_set'
    );

    // Fake constructor
    function Dataset() {}

    it('should return the empty string with no terms', function () {
      expect((new curious.CuriousQuery()).query()).to.equal('');
    });

    it('should return the correct query string', function () {
      var q = (new curious.CuriousQuery())
        .start('Experiment(id=302)', 'experiments')
        .follow('Experiment.reaction_set', 'reactions')
        .follow('Reaction.dataset_set', 'datasets').wrapWith(Dataset)
        .follow('Dataset.attachment_set', 'attachments');
      expect(q.query()).to.equal(expectedQuery);
    });

    it('should allow shortcuts', function () {
      // Terser version of the same query
      var q = new curious.CuriousQuery('Experiment(id=302)', 'experiment')
        .follow('Experiment.reaction_set', 'reactions')
        .follow('Reaction.dataset_set', 'dataset', Dataset)
        .follow('Dataset.attachment_set', 'attachments');
      expect(q.query()).to.equal(expectedQuery);
    });
  });
});

}());
