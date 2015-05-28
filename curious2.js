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

  function make_obj(klass) {
    return function(model) {
      return new klass();
    }
  }

  var CuriousQuery = function() {
    this.terms = [];
    this.relationships = [];
    this.objfs = [];
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

    // extend this query with another query
    extend: function(query) {
      for (var i=0; i<query.terms.length; i++) {
        this.append(query.terms[i], query.relationships[i], query.objfs[i]);
      }
      return this;
    },

    append: function(term, relationship, obj_f) {
      this.terms.push(term);
      this.relationships.push(relationship);
      this.objfs.push(obj_f);
      return this;
    },

    start: function(s, relationship) {
      return this.append(new QueryTermFollow(s), relationship);
    },

    follow: function(s, relationship) {
      return this.append(new QueryTermFollow(s), relationship);
    },

    having: function(s, relationship) {
      return this.append(new QueryTermHaving(s), relationship);
    },

    not_having: function(s, relationship) {
      return this.append(new QueryTermNotHaving(s), relationship);
    },

    with: function(s, relationship) {
      return this.append(new QueryTermWith(s), relationship);
    },

    wrap_with: function(klass) {
      if (this.objfs.length === 0)
        throw("Cannot specify type of object before starting a query");
      this.objfs[this.objfs.length-1] = make_obj(klass);
      return this;
    },

    wrap_dynamically: function(f) {
      if (this.objfs.length === 0)
        throw("Cannot specify function for creating object before starting a query");
      this.objfs[this.objfs.length-1] = f;
      return this;
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
      clt.get(q, this.relationships, this.objfs,
              this.params, this.existing_objects,
              objects_cb, trees_cb);
    }
  };

  var CuriousObjects = (function() {
    function CuriousObject(hash_data) {
      this.id = hash_data.id;
      for (var k in hash_data) {
        this[k] = hash_data[k];
      }
      this.__url = null;
      this.__model = null;
    }

    function parse_objects(data, model, obj_f, existing_objs) {
      if (data.objects === undefined) { return []; }
      var objects = [];

      for (var i=0; i<data.objects.length; i++) {
        var obj = data.objects[i];
        var url = data.urls[i];
        var obj_data = {};

        for (var j=0; j<data.fields.length; j++) {
          obj_data[data.fields[j]] = obj[j];
        }

        var id = obj_data.id;
        var obj;

        if (id !== undefined && existing_objs && existing_objs[id] !== undefined) {
          obj = existing_objs[id];
          for (var k in obj_data) { obj[k] = obj_data[k]; }
        }
        else if (!obj_f)
          obj = new CuriousObject(obj_data);
        else {
          obj = obj_f(obj_data);
          for (var k in obj_data) { obj[k] = obj_data[k]; }
        }
        obj.id = obj_data.id;
        obj.__url = url;
        obj.__model = model;
        objects.push(obj);
      }
      return objects;
    }

    function parse_results_with_trees(relationships, objfs, results, existing_object_dicts) {
      // get objects associated with each subquery. for each subquery, build a
      // hash of ID to object. existing_object_dicts should be an array of dicts,
      // each dict is a mapping of ID to existing objects. if existing objects
      // are specified, will build relationships using existing objects.

      var objects = [];
      var trees = [];

      for (var i=0; i<results.data.length; i++) {
        var obj_f = null;
        if (objfs)
          obj_f = objfs[i];
        var model = results.results[i].model;
        var existing_objs = null;
        if (existing_object_dicts !== undefined && existing_object_dicts !== null &&
            existing_object_dicts[i] !== undefined && existing_object_dicts[i] !== null)
          existing_objs = existing_object_dicts[i];
        var result_objects = parse_objects(results.data[i], model, obj_f, existing_objs);
        var d = {};
        for (var j=0; j<result_objects.length; j++) { d[result_objects[j].id] = result_objects[j]; }
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
            if (src && obj) {
              // forward relationship from query to next query
              src[rel].push(obj);
              // reverse relationship
              obj[rev].push(src);
            }
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
      id_str: id_str,
    }

  }());

  function convert_results_to_output(relationships, objects) {
    var i, j;
    var output = {};

    for (i = 0; i < objects.length; i++) {
      if (output[relationships[i]]) {
        j = 2;
        while (output[relationships[i]+'_'+j]) { j++; }
        output[relationships[i]+'_'+j] = CuriousObjects.d2a(objects[i]);
      }
      else
        output[relationships[i]] = CuriousObjects.d2a(objects[i]);
    }

    return output;
  }

  function get_args(query_args, app_default_args) {
    var k;
    var args = {x: 0, fk: 0}; // default args
    var immutable_args = {d: 1}; // these are always set, no matter what

    if (app_default_args) {
      for (k in app_default_args) {
        if (app_default_args.hasOwnProperty(k)) {
          args[k] = app_default_args[k];
        }
      }
    }

    if (query_args) {
      for (k in query_args) {
        if (query_args.hasOwnProperty(k)) {
          args[k] = query_args[k];
        }
      }
    }

    for (k in immutable_args) {
      args[k] = immutable_args[k];
    }

    return args;
  }

  function convert_array_array_to_dict_array(objects_array) {
    var i;
    var dict_array = [];
    for (i=0; i<objects_array.length; i++) {
      if (objects_array[i]) {
        dict_array.push(CuriousObjects.a2d(objects_array[i]));
      }
      else {
        dict_array.push(null);
      }
    }
    return dict_array;
  }

  // Helper for making a Curious query and getting back parsed objects. Use with
  // angular $http compatible HTTP request facilities (e.g. jQuery?)

  var CuriousQ = function(curious_url, http, app_default_params, quiet) {
    function get(q, relationships, objfs, params, existing_objects, objects_cb, trees_cb) {
      var args;
      var post_cb;

      if (quiet === undefined || quiet !== true) {
        console.warn(q);
      }

      if (existing_objects) {
        existing_objects = convert_array_array_to_dict_array(existing_objects);
      }

      args = get_args(params, app_default_params);
      args.q = q;

      post_cb = function(resp) {
        var objects;
        var res;
        res = CuriousObjects.parse_with_trees(relationships, objfs, resp.result, existing_objects);
        objects = convert_results_to_output(relationships, res.objects);
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
  ex.CuriousObjects = CuriousObjects;
  ex.CuriousQ = CuriousQ;
  ex.CuriousQuery = CuriousQuery;

})();
