(function() {

// Copied from polymer-0.5.3 core-ajax/core-xhr.html
// See http://polymer.github.io/LICENSE.txt for copyright and license
// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.

function XHR() {};
XHR.prototype = {
  /**
   * Sends a HTTP request to the server and returns the XHR object.
   *
   * @method request
   * @param {Object} inOptions
   *    @param {String} inOptions.url The url to which the request is sent.
   *    @param {String} inOptions.method The HTTP method to use, default is GET.
   *    @param {boolean} inOptions.sync By default, all requests are sent asynchronously. To send synchronous requests, set to true.
   *    @param {Object} inOptions.params Data to be sent to the server.
   *    @param {Object} inOptions.body The content for the request body for POST method.
   *    @param {Object} inOptions.headers HTTP request headers.
   *    @param {String} inOptions.responseType The response type. Default is 'text'.
   *    @param {boolean} inOptions.withCredentials Whether or not to send credentials on the request. Default is false.
   *    @param {Object} inOptions.callback Called when request is completed.
   * @returns {Object} XHR object.
   */
  request: function(options) {
    var xhr = new XMLHttpRequest();
    var url = options.url;
    var method = options.method || 'GET';
    var async = !options.sync;
    //
    var params = this.toQueryString(options.params);
    if (params && method.toUpperCase() == 'GET') {
      url += (url.indexOf('?') > 0 ? '&' : '?') + params;
    }
    var xhrParams = this.isBodyMethod(method) ? (options.body || params) : null;
    //
    xhr.open(method, url, async);
    if (options.responseType) {
      xhr.responseType = options.responseType;
    }
    if (options.withCredentials) {
      xhr.withCredentials = true;
    }
    this.makeReadyStateHandler(xhr, options.callback);
    this.setRequestHeaders(xhr, options.headers);
    xhr.send(xhrParams);
    if (!async) {
      xhr.onreadystatechange(xhr);
    }
    return xhr;
  },

  toQueryString: function(params) {
    var r = [];
    for (var n in params) {
      var v = params[n];
      n = encodeURIComponent(n);
      r.push(v == null ? n : (n + '=' + encodeURIComponent(v)));
    }
    return r.join('&');
  },

  isBodyMethod: function(method) {
    return this.bodyMethods[(method || '').toUpperCase()];
  },
  
  bodyMethods: {
    POST: 1,
    PUT: 1,
    PATCH: 1,
    DELETE: 1
  },

  makeReadyStateHandler: function(xhr, callback) {
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        callback && callback.call(null, xhr.response, xhr);
      }
    };
  },

  setRequestHeaders: function(xhr, headers) {
    if (headers) {
      for (var name in headers) {
        xhr.setRequestHeader(name, headers[name]);
      }
    }
  }
};

function CuriousXhr() {
  var xhr = new XHR();
  var post = function (url, data) {
    // create a new scope with its own "success_cb"
    return (function() {
      var success_cb = null;
        
      xhr.request({
        url: url,
        body: JSON.stringify(data),
        method: 'POST',
        callback: function(response, xhr) {
          if (success_cb) {
            var r = JSON.parse(xhr.responseText);
            success_cb(r);
          }
        }
      });

      function success(cb) {
        success_cb = cb;
        return this;
      }

      return { success: success };
    })();
  }

  return {post: post};
}

var ex = undefined;
if (typeof window !== 'undefined') { ex = window; }
else if (typeof exports !== 'undefined' && exports) { ex = exports; }

ex.CuriousXhr = CuriousXhr;
})();
