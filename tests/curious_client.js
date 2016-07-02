/* global describe it before */

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
        var requestFunctions;
        // Set the global axios variable to test defaults
        if (typeof global !== 'undefined' && !global.axios) {
          global.axios = axios;
        }

        requestFunctions = [
          curious.CuriousClient.wrappers.axios(axios),
          curious.CuriousClient.wrappers.axios(axios.post),
          curious.CuriousClient.wrappers.axios(),
        ];

        try {
          requestFunctions.forEach(function (requestFunction) {
            var client = new curious.CuriousClient(
              CURIOUS_URL,
              requestFunction,
              null,
              true
            );

            client.performQuery(
              'query does not matter',
              ['experiments', 'reactions']
            )
            .then(function (response) {
              var expectedObjects = examples.expectedObjects();
              expect(response).to.deep.equal({
                trees: [null, null],
                objects: {
                  experiments: curious.CuriousObjects.values(expectedObjects.experiments),
                  reactions: curious.CuriousObjects.values(expectedObjects.reactions),
                },
              });
            }, function (error) {
              throw error;
            });
          });

          // Clean up the global axios variable
          if (typeof global !== 'undefined' && global.axios) {
            delete global.axios;
          }

          done();
        } catch (error) {
          done(error);
        }
      });
    });
  });
}());
