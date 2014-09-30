// Wrapper around request.js package to make it look like jQuery and angular http

exports.http = (function() {
  var request = require('request');

  function Request(url, data) {
    var success_cb = undefined;

    request.post({url: url, body: JSON.stringify(data)}, function(error, response, body) {
      if (success_cb) {
        var resp = JSON.parse(body);
        success_cb(resp);
      }
    });

    function success(cb) {
      success_cb = cb;
      return this;
    }

    return {
      success: success
    }
  }

  function post(url, data) {
    return Request(url, data);
  }

  return {
    post: post
  }
})();
