// mocha.js tests for functions dealing with Curious objects
(function () {
'use strict';

var http = require('http');
var axios = require('axios');
var expect = require('chai').expect;
var curious = require('../curious.js');
var examples = require('./examples.js');

// TESTS
var PORT = 8080;
var CURIOUS_URL = 'http://localhost:' + PORT;

describe('CuriousClient', function () {
  before(function () {
    return (
      http
        .createServer(function (request, response) {
          response.writeHead(200, {
            'Content-Type': 'application/json',
          });
          response.end(JSON.stringify(examples.response()));
        })
        .listen(PORT)
    );
  });

  describe('#performQuery', function () {

    it('should work with axios', function (done) {
      var client = new curious.CuriousClient(CURIOUS_URL, function (url, args) {
        // axios returns the server's response nested within an object
        // (response.data); we add a tiny filter function to pull that server
        // response out
        return axios.post(url, args)
          .then(function (response) { return response.data; });
      }, null, true);

      client.performQuery(
        'query does not matter',
        ['experiments', 'reactions']
      )
      .then(function (response) {
        try {
          var expectedObjects = examples.expectedObjects();
          expect(response).to.deep.equal({
            trees: [null, null],
            objects: {
              experiments: curious.CuriousObjects.values(expectedObjects.experiments),
              reactions: curious.CuriousObjects.values(expectedObjects.reactions),
            },
          });
          done();
        }
        catch (error) {
          done(error);
        }
      }, function (error) {
        throw error;
      });
    });
  });
});
}());
