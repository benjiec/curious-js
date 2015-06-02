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

  describe('#start', function () {
    var startingTerm = 'Experiment(id=302)';

    // Fake constructor
    function Experiment() { return this; }
    function experimentFactory() { return Object.create(new Experiment()); }

    it('should start the query', function () {
      var q = (new curious.CuriousQuery()).start(startingTerm, 'experiments');

      expect(q.query()).to.equal(startingTerm);
    });

    it('should require both a term and a relationship', function () {
      expect(function () {
        (new curious.CuriousQuery()).start();
      }).to.throw(/term/);

      expect(function () {
        (new curious.CuriousQuery()).start(startingTerm);
      }).to.throw(/relationship/);
    });

    it('should allow custom constructors', function () {
      var q = (new curious.CuriousQuery())
        .start(startingTerm, 'experiments')
        .wrapWith(Experiment);

      expect(q.query()).to.equal(startingTerm);

      expect(q.objectFactories).to.have.length(1);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
    });

    it('should allow function factories', function () {
      var q = (new curious.CuriousQuery())
        .start(startingTerm, 'experiments')
        .wrapDynamically(experimentFactory);

      expect(q.query()).to.equal(startingTerm);

      expect(q.objectFactories).to.have.length(1);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
    });

    it('should allow shortcuts', function () {
      var q = new curious.CuriousQuery(startingTerm, 'experiments', Experiment);
      var q2 = new curious.CuriousQuery(startingTerm, 'experiments', experimentFactory);

      expect(q.query()).to.equal(startingTerm);

      expect(q.objectFactories).to.have.length(1);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);

      expect(q2.objectFactories).to.have.length(1);
      expect(q2.objectFactories[0]()).to.be.an.instanceof(Experiment);
    });
  });


});

}());
