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


  describe('#follow', function () {
    var expectedQuery = 'Experiment(id=302), Experiment.reaction_set';
    var startingQuery;


    // Fake constructor
    function Experiment() { return this; }
    function Reaction() { return this; }
    function reactionFactory() { return Object.create(new Reaction()); }

    beforeEach(function () {
      startingQuery = new curious.CuriousQuery(
        'Experiment(id=302)', 'experiments', Experiment
      );
    });

    it('should append to the query with a comma', function () {
      var q = startingQuery
        .follow('Experiment.reaction_set', 'reactions');
      expect(q.query()).to.equal(expectedQuery);
    });

    it('should successfully allow terms without commas', function () {
      var q = startingQuery
        .follow('Experiment.reaction_set Reaction.dataset_set', 'datasets');

      expect(q.query()).to.equal(expectedQuery + ' Reaction.dataset_set');
    });

    it('should require both a term and a relationship', function () {
      expect(function () {
        startingQuery.follow();
      }).to.throw(/term/);

      expect(function () {
        startingQuery.follow('Experiment.reaction_set');
      }).to.throw(/relationship/);
    });

    it('should allow custom constructors', function () {
      var q = startingQuery
        .follow('Experiment.reaction_set', 'reactions')
        .wrapWith(Reaction);

      expect(q.query()).to.equal(expectedQuery);

      expect(q.objectFactories).to.have.length(2);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q.objectFactories[1]()).to.be.an.instanceof(Reaction);
    });

    it('should allow function factories', function () {
      var q = startingQuery
        .follow('Experiment.reaction_set', 'reactions')
        .wrapDynamically(reactionFactory);

      expect(q.query()).to.equal(expectedQuery);

      expect(q.objectFactories).to.have.length(2);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q.objectFactories[1]()).to.be.an.instanceof(Reaction);
    });

    it('should allow shortcuts', function () {
      var q = startingQuery.clone()
        .follow('Experiment.reaction_set', 'reactions', Reaction);
      var q2 = startingQuery.clone()
        .follow('Experiment.reaction_set', 'reactions', reactionFactory);

      expect(q.query()).to.equal(expectedQuery);

      expect(q.objectFactories).to.have.length(2);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q.objectFactories[1]()).to.be.an.instanceof(Reaction);

      expect(q2.query()).to.equal(expectedQuery);

      expect(q2.objectFactories).to.have.length(2);
      expect(q2.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q2.objectFactories[1]()).to.be.an.instanceof(Reaction);
    });

  });

  describe('#with', function () {
    var expectedQuery = (
      'Experiment(id=302)'
      + ' ?(Experiment.compounds_of_interest)'
      + ' Experiment.reaction_set'
    );
    var startingQuery;

    // Fake constructor
    function Experiment() { return this; }
    function Reaction() { return this; }
    function Compound() { return this; }
    function compoundFactory() { return Object.create(new Compound()); }

    beforeEach(function () {
      startingQuery = new curious.CuriousQuery(
        'Experiment(id=302)', 'experiments', Experiment
      );
    });

    it('should append to the query with a groupng', function () {
      var q = startingQuery
        .with('Experiment.compounds_of_interest', 'compounds')
        .follow('Experiment.reaction_set', 'reactions');

      expect(q.query()).to.equal(expectedQuery);
    });

    it('should successfully allow terms without commas inside the group', function () {
      var q = startingQuery
        .with('Experiment.compounds_of_interest Compound.standard_set', 'standards')
        .follow('Experiment.reaction_set', 'reactions');

      expect(q.query()).to.equal(
        'Experiment(id=302)'
        + ' ?(Experiment.compounds_of_interest Compound.standard_set)'
        + ' Experiment.reaction_set'
      );
    });

    it('should require both a term and a relationship', function () {
      expect(function () {
        startingQuery.with();
      }).to.throw(/term/);

      expect(function () {
        startingQuery.with('Experiment.reaction_set');
      }).to.throw(/relationship/);
    });

    it('should allow custom constructors', function () {
      var q = startingQuery
        .with('Experiment.compounds_of_interest', 'compounds').wrapWith(Compound)
        .follow('Experiment.reaction_set', 'reactions').wrapWith(Reaction);

      expect(q.query()).to.equal(expectedQuery);

      expect(q.objectFactories).to.have.length(3);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q.objectFactories[1]()).to.be.an.instanceof(Compound);
      expect(q.objectFactories[2]()).to.be.an.instanceof(Reaction);
    });

    it('should allow function factories', function () {
      var q = startingQuery
        .with('Experiment.compounds_of_interest', 'compounds')
          .wrapDynamically(compoundFactory)
        .follow('Experiment.reaction_set', 'reactions').wrapWith(Reaction);

      expect(q.query()).to.equal(expectedQuery);

      expect(q.objectFactories).to.have.length(3);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q.objectFactories[1]()).to.be.an.instanceof(Compound);
      expect(q.objectFactories[2]()).to.be.an.instanceof(Reaction);
    });

    it('should allow shortcuts', function () {
      var q = startingQuery.clone()
        .with('Experiment.compounds_of_interest', 'compounds', Compound)
        .follow('Experiment.reaction_set', 'reactions').wrapWith(Reaction);
      var q2 = startingQuery.clone()
        .with('Experiment.compounds_of_interest', 'compounds', compoundFactory)
        .follow('Experiment.reaction_set', 'reactions').wrapWith(Reaction);

      expect(q.query()).to.equal(expectedQuery);

      expect(q.objectFactories).to.have.length(3);
      expect(q.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q.objectFactories[1]()).to.be.an.instanceof(Compound);
      expect(q.objectFactories[2]()).to.be.an.instanceof(Reaction);

      expect(q2.query()).to.equal(expectedQuery);

      expect(q2.objectFactories).to.have.length(3);
      expect(q2.objectFactories[0]()).to.be.an.instanceof(Experiment);
      expect(q2.objectFactories[1]()).to.be.an.instanceof(Compound);
      expect(q2.objectFactories[2]()).to.be.an.instanceof(Reaction);
    });
  });

  // having/notHaving should work basically the same way
  [
    {word: 'having', symbol: '+'},
    {word: 'notHaving', symbol: '-'},
  ].forEach(function (having) {

    describe('#' + having.word, function () {
      var havingClause = 'Experiment.compounds_of_interest(id=123)';
      var expectedQuery = 'Experiment ' + having.symbol + '(' + havingClause + ')';
      var startingQuery;

      beforeEach(function () {
        startingQuery = new curious.CuriousQuery(
          'Experiment', 'experiments'
        );
      });

      it('should append to the query with a "' + having.symbol + '"', function () {
        var q = startingQuery[having.word](havingClause);
        expect(q.query()).to.equal(expectedQuery);
      });

      it('should correctly insert into a query', function () {
        var q = startingQuery[having.word](havingClause)
          .follow('Experiment.reaction_set', 'reactions');
        expect(q.query()).to.equal(expectedQuery + ' Experiment.reaction_set');
      });
    });
  });

  describe('#setExistingObjects', function () {
    var query;
    var someObjects = [{a: 'b'}, {c: 'd', e: 'f'}, {g: 23}];

    beforeEach(function () {
      query = new curious.CuriousQuery();
    });

    it('should set the existingObjects property', function () {
      query.setExistingObjects(someObjects);
      expect(query.existingObjects).to.deep.equal(someObjects);
    });

    it('should make a one-level shallow copy', function () {
      query.setExistingObjects(someObjects);

      // one-level-deep assignments do not transfer
      someObjects[0] = 'moop';
      expect(query.existingObjects[0]).to.deep.equal({a: 'b'});

      // nested assigments do transfer, however
      someObjects[1].c = 'moop';
      expect(query.existingObjects).to.have.deep.property('[1].c', 'moop');
    });

    it('should do nothing if passed in nothing', function () {
      expect(query.existingObjects).to.be.null;
      query.setExistingObjects();
      expect(query.existingObjects).to.be.null;
    });
  });
});

}());
