// Curious client-side JSON parsing
//

(function(){

  var CuriousQuery = function() {
    this.terms = [];
    this.relationships = [];
    this.classes = [];
  };

  CuriousQuery.prototype = {
    query: function() { return this.terms.join(' '); },
    add: function(term, relationship, klass) {
      this.terms.push(term);
      this.relationships.push(relationship);
      this.classes.push(klass);
      return this;
    },
  };

  var CuriousObjects = (function() {
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

    function parse_results(relationships, classes, results, existing_object_dicts) {
      return parse_results_with_trees(relationships, classes, results, existing_object_dicts).objects;
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
      parse: parse_results,
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

    function __get(q, params, relationships, classes, existing_object_arrays, cb, trees_cb) {
      if (quiet === undefined || quiet !== true)
        console.warn(q);

      var existing_object_dicts = undefined;
      if (existing_object_arrays) {
        existing_object_dicts = [];
        for (var i=0; i<existing_object_arrays.length; i++) {
          var data_array = existing_object_arrays[i];
          if (data_array) {
            existing_object_dicts.push(CuriousObjects.a2d(data_array));
          }
          else {
            existing_object_dicts.push(null);
          }
        }
      }

      var args = {d: 1, fk: 0, q: q};
      var overwrite_args = {x: 0};

      if (params) {
        for (var k in params) {
          if (args[k] === undefined) { args[k] = params[k]; }
        }
      }
      if (app_default_params) {
        for (var k in app_default_params) {
          if (args[k] === undefined) { args[k] = app_default_params[k]; }
        }
      }
      for (var k in overwrite_args) {
        if (args[k] === undefined) { args[k] = overwrite_args[k]; }
      }

      var post_cb = function(resp) {
        var res = CuriousObjects.parse_with_trees(relationships, classes, resp.result, existing_object_dicts);
        var objects = res.objects;
        for (var i=0; i<objects.length; i++) { objects[i] = CuriousObjects.d2a(objects[i]); }
        cb(objects);
        if (trees_cb) { trees_cb(res.trees); }
      };

      http.post(curious_url, args).success(post_cb);
    }

    function query(query_object, cb, params, tree_cb) {
      var q = query_object.query();
      __get(q, params, query_object.relationships, query_object.classes, null, cb, tree_cb);
    }

    function get(q, relationships, cb, params, tree_cb) { __get(q, params, relationships, null, null, cb, tree_cb); }

    function get_with_objs(q, relationships, existing_object_arrays, cb, params, tree_cb) {
      __get(q, params, relationships, null, existing_object_arrays, cb, tree_cb);
    }

    function get_with_start(q, relationships, starting_objects, cb, params, tree_cb) {
      var existing_object_arrays = [];
      for (var i=0; i<relationships.length; i++) {
        existing_object_arrays.push(null);
      }
      existing_object_arrays[0] = starting_objects;
      __get(q, params, relationships, null, existing_object_arrays, cb, tree_cb);
    }

    return {
      query: query,
      get: get,
      get_with_objs: get_with_objs,
      get_with_start: get_with_start
    }
  };

  var ex = undefined;
  if (typeof window !== 'undefined') { ex = window; }
  else if (typeof exports !== 'undefined' && exports) { ex = exports; }
  ex.CuriousQ = CuriousQ;
  ex.CuriousObjects = CuriousObjects;
  ex.CuriousQuery = CuriousQuery;

})();
