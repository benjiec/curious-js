// Curious client-side JSON parsing
//

(function(){

  var QueryTermFollow = function(term) {
    this.term = term;
    this.to_s = function() { return this.term; };
    this.implicit_join = false;
  };

  var QueryTermHaving = function(term) {
    this.term = term;
    this.to_s = function() { return '+('+term+')'; };
    this.implicit_join = true;
  };

  var QueryTermNotHaving = function(term) {
    this.term = term;
    this.to_s = function() { return '-('+term+')'; };
    this.implicit_join = true;
  };

  var QueryTermWith = function(term) {
    this.term = term;
    this.to_s = function() { return '?('+term+')'; };
    this.implicit_join = true;
  };

  var CuriousQuery = function() {
    this.terms = [];
    this.relationships = [];
    this.classes = [];
    this.params = null;
    this.existing_objects = null;  // array of object arrays
  };

  CuriousQuery.prototype = {
    query: function() {
      var s = [];
      for (var i=0; i<this.terms.length; i++) {
        if (i > 0) {
          if (!this.terms[i-1].implicit_join && !this.terms[i].implicit_join)
            s.push(', ');
          else
            s.push(' ');
        }
        s.push(this.terms[i].to_s());
      }
      return s.join('');
    },

    add: function(term, relationship, klass) {
      this.terms.push(term);
      this.relationships.push(relationship);
      this.classes.push(klass);
      return this;
    },

    start: function(s, relationship, klass) {
      return this.add(new QueryTermFollow(s), relationship, klass);
    },

    follow: function(s, relationship, klass) {
      return this.add(new QueryTermFollow(s), relationship, klass);
    },

    having: function(s, relationship, klass) {
      return this.add(new QueryTermHaving(s), relationship, klass);
    },

    not_having: function(s, relationship, klass) {
      return this.add(new QueryTermNotHaving(s), relationship, klass);
    },

    with: function(s, relationship, klass) {
      return this.add(new QueryTermWith(s), relationship, klass);
    },

    set_params: function(p) {
      this.params = p;
      return this;
    },

    set_existing_objects: function(objs) {  // array of object arrays
      this.existing_objects = objs;
      return this;
    },

    perform: function(clt, objects_cb, trees_cb) {
      var q = this.query()
      clt.get(q, this.relationships, this.classes,
              this.params, this.existing_objects,
              objects_cb, trees_cb);
    }
  };

  var _CuriousObjects = (function() {
    function CuriousObject(hash_data) {
      this.id = hash_data.id;
      for (var k in hash_data) {
        this[k] = hash_data[k];
      }
      this.__url = null;
      this.__model = null;
      this.__dirty = false;
    }

    function parse_objects(data, model, klass) {
      if (data.objects === undefined) { return []; }
      var objects = [];
      for (var i=0; i<data.objects.length; i++) {
        var obj = data.objects[i];
        var url = data.urls[i];
        var obj_data = {};
        for (var j=0; j<data.fields.length; j++) {
          obj_data[data.fields[j]] = obj[j];
        }
        var obj;
        if (!klass)
          obj = new CuriousObject(obj_data);
        else {
          obj = new klass();
          for (var k in obj_data) { obj[k] = obj_data[k]; }
        }
        obj.id = obj_data.id;
        obj.__url = url;
        obj.__model = model;
        objects.push(obj);
      }
      return objects;
    }

    function parse_results_with_trees(relationships, classes, results, existing_object_dicts) {
      // get objects associated with each subquery. for each subquery, build a
      // hash of ID to object. existing_object_dicts should be an array of dicts,
      // each dict is a mapping of ID to existing objects. if existing objects
      // are specified, will build relationships using existing objects.

      var objects = [];
      var trees = [];

      for (var i=0; i<results.data.length; i++) {
        var klass = null;
        if (classes)
          klass = classes[i];
        var model = results.results[i].model;
        var result_objects = parse_objects(results.data[i], model, klass);
        var d = {};
        for (var j=0; j<result_objects.length; j++) {
          if (existing_object_dicts !== undefined && existing_object_dicts !== null &&
              existing_object_dicts[i] !== undefined && existing_object_dicts[i] !== null &&
              existing_object_dicts[i][result_objects[j].id] !== undefined) {
            d[result_objects[j].id] = existing_object_dicts[i][result_objects[j].id];
          }
          else {
            d[result_objects[j].id] = result_objects[j];
          }
        }
        objects.push(d);
        trees.push(null);
      }

      // for each subquery, add a relationship to results of next subquery, and
      // then a reverse relationship
      for (var i=1; i<results.results.length; i++) {
        var rel = relationships[i];

        var res_tups = results.results[i].objects;
        var join_idx = results.results[i].join_index;
        var join_src = objects[join_idx];
        var join_obj = objects[i];
        var rev = relationships[join_idx];
        trees[i] = results.results[i].tree;

        // add empty replationship
        for (var k in join_src) { join_src[k][rel] = []; }
        for (var k in join_obj) { join_obj[k][rev] = []; }

        for (var j=0; j<res_tups.length; j++) {
          var obj_src = res_tups[j];
          var src = join_src[obj_src[1]];
          if (obj_src[0]) {
            var obj = join_obj[obj_src[0]];

            // forward relationship from query to next query
            src[rel].push(obj);
            // reverse relationship
            obj[rev].push(src);
          }
        }
      }

      return {objects: objects, trees: trees};
    }

    function dict_to_array(d) {
      var r = [];
      for (var k in d) { r.push(d[k]); }
      return r;
    }

    function array_to_dict(a) {
      var d = {};
      for (var i=0; i<a.length; i++) {
        d[a[i].id] = a[i];
      }
      return d;
    }

    function id_list(objects) {
      var ids = [];
      for (var i=0; i<objects.length; i++) {
        if (ids.indexOf(objects[i].id) < 0) {
          ids.push(objects[i].id);
        }
      }
      return ids;
    }

    function id_str(objects) {
      var ids = id_list(objects);
      if (ids.length === 0) { return null; }
      return ids.join(',');
    }

    return {
      parse_with_trees: parse_results_with_trees,
      d2a: dict_to_array,
      a2d: array_to_dict,
      id_list: id_list,
      id_str: id_str
    }

  }());


  // Helper for making a Curious query and getting back parsed objects. Use with
  // angular $http compatible HTTP request facilities (e.g. jQuery?)

  var CuriousQ = function(curious_url, http, app_default_params, quiet) {
    function get(q, relationships, classes, params, existing_objects, objects_cb, trees_cb) {
      var i, k;
      var args, immutable_args;
      var data_array;
      var existing_object_dicts;
      var post_cb;

      if (quiet === undefined || quiet !== true) {
        console.warn(q);
      }

      if (existing_objects) {
        existing_object_dicts = [];
        for (i = 0; i < existing_objects.length; i++) {
          data_array = existing_objects[i];
          if (data_array) {
            existing_object_dicts.push(_CuriousObjects.a2d(data_array));
          }
          else {
            existing_object_dicts.push(null);
          }
        }
      }

      // Default args
      args = {x: 0, fk: 0};

      // App-level arg settings
      if (app_default_params) {
        for (k in app_default_params) {
          if (app_default_params.hasOwnProperty(k)) {
            args[k] = app_default_params[k];
          }
        }
      }

      // Query-level arg settings
      if (params) {
        for (k in params) {
          if (params.hasOwnProperty(k)) {
            args[k] = params[k];
          }
        }
      }

      // Values for immutable args: these are always set, no matter what
      immutable_args = {d: 1, q: q};
      for (k in immutable_args) {
        args[k] = immutable_args[k];
      }

      post_cb = function(resp) {
        var i;
        var objects;
        var res;

        res = _CuriousObjects.parse_with_trees(relationships, classes, resp.result, existing_object_dicts);
        objects = res.objects;

        for (i = 0; i < objects.length; i++) { objects[i] = _CuriousObjects.d2a(objects[i]); }
        objects_cb(objects);
        if (trees_cb) { trees_cb(res.trees); }
      };

      return http.post(curious_url, args).success(post_cb);
    }

    return { get: get }
  };

  var ex = undefined;
  if (typeof window !== 'undefined') { ex = window; }
  else if (typeof exports !== 'undefined' && exports) { ex = exports; }
  ex.CuriousQ2 = CuriousQ;
  ex.CuriousQuery = CuriousQuery;

})();
