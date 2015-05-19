var repl = require('repl');
var curious = require('./curious2.js');

var replServer = repl.start({
  prompt: 'curious-js > ',
  ignoreUndefined: true,
});

replServer.context.curious = curious;

require('repl.history')(replServer, process.env.HOME + '/.node_history');
