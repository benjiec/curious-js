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

  // create a new scope with its own "success_cb"
  function _request(url, data, params, content_type, method, ignore_requested_with) {
    var success_cb = null;
    var error_cb = null;

    var headers = { 'Content-Type': content_type ? content_type : 'text/plain' }
    if (!ignore_requested_with)
      headers['X-Requested-With'] = 'XMLHttpRequest';

    xhr.request({
      url: url,
      body: data,
      params: params,
      method: method,
      headers: headers,
      callback: function(response, xhr) {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (success_cb) {
            var r = null;
            try {
              r = JSON.parse(xhr.responseText);
            }
            catch(e) {
              r = xhr.responseText;
            }
            success_cb(r);
          }
        }
        else {
          if (error_cb) {
            var r = null;
            try {
              r = JSON.parse(xhr.responseText);
            }
            catch(e) {
              r = xhr.responseText;
            }
            error_cb(r);
          }
        }
      }
    });

    function success(cb) {
      success_cb = cb;
      return this;
    }

    function error(cb) {
      error_cb = cb;
      return this;
    }

    return { success: success, error: error };
  }

  function post(url, data, params, content_type, ignore_requested_with) {
    if (data)
      data = JSON.stringify(data);
    var x = _request(url, data, params, content_type, "POST", ignore_requested_with);
    return x;
  }

  function post_form_data(url, form_data, content_type) {
    var x = _request(url, form_data, null, content_type, "POST");
    return x;
  }

  function put(url, data, params, content_type, ignore_requested_with) {
    if (data)
      data = JSON.stringify(data);
    var x = _request(url, data, params, content_type, "PUT", ignore_requested_with);
    return x;
  }

  function get(url, data, params, content_type, ignore_requested_with) {
    var x = _request(url, data, params, content_type, "GET", ignore_requested_with);
    return x;
  }

  return {
    post: post,
    post_form_data: post_form_data,
    put: put,
    get: get
  };
}

var ex = undefined;
if (typeof window !== 'undefined') { ex = window; }
else if (typeof exports !== 'undefined' && exports) { ex = exports; }

ex.CuriousXhr = CuriousXhr();
})();
