/**
 * Module for curious client-side query construction and JSON parsing.
 *
 * @module curious
 *
 * @exports CuriousObjects Tools for dealing with Curious objects
 *
 * @exports CuriousClient Performs curious queries, given a client, and deals
 *                        with the callbacks
 *
 * @exports CuriousQuery Class for constructiong curious queries.
 *
 */
(function () {
  // QUERY TERMS

  /**
   * Abstract base class for query terms.
   *
   * @abstract
   * @class
   */
  function _QueryTerm(term) {
    /** The term contents @readonly @public */
    this.term = function () { return term; };

    return this;
  }

  /**
   * Return the term contents as they belong in a query, wrapped with parens and
   * other operators
   *
   * @readonly
   * @public
   *
   * @return {string} The term contents, formatted.
   */
  _QueryTerm.prototype.toString = function () { return this.term(); };

  /**
   * Determine whether or not the terms sticks implicit joins into adjacent
   * terms.
   *
   * @readonly
   * @public
   *
   * @return {boolean} True if the term implicitly joins with its following term
   */
  _QueryTerm.prototype.implicitJoin = function () { return true; };


  /**
   * Make a term that follows the query chain.
   *
   * @class
   * @extends {_QueryTerm}
   */
  var QueryTermFollow = function (term) {
    _QueryTerm.call(this, term);

    return this;
  };
  QueryTermFollow.prototype = new _QueryTerm();

  /** @override */
  QueryTermFollow.prototype.implicitJoin = function () { return false; };


  /**
   * Make a term that performs a filter.
   *
   * @class
   * @extends {_QueryTerm}
   */
  var QueryTermHaving = function (term) {
    _QueryTerm.call(this, term);

    return this;
  };
  QueryTermHaving.prototype = new _QueryTerm();

  /** @override */
  QueryTermHaving.prototype.toString = function () {
    return '+(' + this.term() + ')';
  };

  /**
   * Make a term that performs a negative filter.
   *
   * @class
   * @extends {_QueryTerm}
   */
  var QueryTermNotHaving = function (term) {
    _QueryTerm.call(this, term);

    return this;
  };
  QueryTermNotHaving.prototype = new _QueryTerm();

  /** @override */
  QueryTermNotHaving.prototype.toString = function () {
    return '-(' + this.term() + ')';
  };

  /**
   * Make a term that performs an outer join.
   *
   * @class
   * @extends {_QueryTerm}
   */
  var QueryTermWith = function (term) {
    _QueryTerm.call(this, term);

    return this;
  };
  QueryTermWith.prototype = new _QueryTerm();

  /** @override */
  QueryTermWith.prototype.toString = function () {
    return '?(' + this.term() + ')';
  };


  // QUERY OBJECT

  /**
   * Make a Curious query from constituent parts, using a chain of method
   * calls to a single object.
   *
   * CuriousQuery objects are an object-based representation of a Curious query
   * string to make passing around parts of a query and assembling queries
   * easier.
   *
   * The result of curious queries will be an object containing arrays of
   * objects, as specified in the Curious query. This would be analogous to what
   * a Django QuerySet might look like on the back end.
   *
   * If there is more than one kind of object returned by the query and the
   * query specifies some kind of relationship between the data in the objects
   * (for example, Reactions that have Datasets), the returned objects will have
   * attributes that point to their related objects. The names of these
   * relationships are provided as a user-specified parameter.
   *
   * You construct CuriousQuery objects with a repeated chain of function calls
   * on a core object, CuriousQuery object, much like in jQuery, or _.chain().
   * Every stage of the chain specifies a new term in the query, and a
   * relationship name as a string. The stages can also take an optional third
   * parameter that will specify the class of the constructed objects; (insead
   * of just CuriousObject).
   *
   * The initial Curious term happens either by passing parameters directly to
   * the construtor, or by calling .start().
   *
   * @example
   * var q = (new CuriousQuery).
   *   .start('Experiment(id=302)', 'experiment')
   *   .follow('Experiment.reaction_set', 'reactions')
   *   .with('Reaction.dataset_set', 'dataset').wrapWith(Dataset)
   *   .follow('Dataset.attachment_set');
   *
   *  q.query() ==
   *    'Experiment(id=302) Experiment.reaction_set '
   *    + 'Reaction.dataset_set, Dataset.attachment_set';
   *
   * @example
   * // Terser version
   * var q = new CuriousQuery('Experiment(id=302)', 'experiment')
   *   .follow('Experiment.reaction_set', 'reactions')
   *   .with('Reaction.dataset_set', 'dataset', Dataset)
   *   .follow('Dataset.attachment_set');
   *
   * @class
   *
   * @param {string} [initialTermString] The string for the starting term
   * @param {string} [initialRelationship] The starting term's relationship
   * @param {function} [initialObjectClass] A custom object class constructor
   *                                        for the starting term
   *
   *
   * @return {CuriousQuery} The newly constructed object.
   */
  var CuriousQuery = function (
    initialTermString, initialRelationship, initialObjectClass
  ) {
    this.terms = [];
    this.relationships = [];
    this.objectFactories = [];
    this.params = null;
    this.existingObjects = null;  // array of object arrays

    if (initialTermString && initialRelationship) {
      this.start(initialTermString, initialRelationship, initialObjectClass);
    }

    return this;
  };

  /**
   * Return the constructed query string represented by this object.
   *
   * @return {string} The fully constructed query.
   */
  CuriousQuery.prototype.query = function () {
    var query = '';
    var termIndex;

    for (termIndex = 0; termIndex < this.terms.length; termIndex++) {
      // The first term just gets added directly: it's the starting table.
      // The following terms either do or do not have an implicit inner join
      // between them
      if (termIndex > 0) {
        if (
          !this.terms[termIndex - 1].implicitJoin()
          && !this.terms[termIndex].implicitJoin()
        ) {
          query += ', ';
        } else {
          query += ' ';
        }
      }

      query += this.terms[termIndex].toString();
    }

    return query;
  };

  /**
   * Extend this query object with another query object: Return a new query
   * chain with the current query chain's terms followed
   * by the other query chain's terms.
   *
   * @param {CuriousQuery} query The other query
   * @return {CuriousQuery} The combined query
   */
  CuriousQuery.prototype.extend = function (query) {
    for (var termIndex = 0; termIndex < query.terms.length; termIndex++) {
      this._append(
        query.terms[termIndex],
        query.relationships[termIndex],
        query.objectFactories[termIndex]
      );
    }

    return this;
  };

  /**
   * Append another term to this query: generic method.
   *
   * Consumers should not use this method, as they do not have access to the
   * QueryTerm classes.
   *
   * @private
   * @param {_QueryTerm} termObject A QueryTerm object to append to the term
   * @param {string} relationship The name of this term in inter-term
   *                              relationships.
   * @param {function} [constructor] A custom constructor for the resulting
   *                                 objects, if this part of the query returns
   *                                 new objects.
   *
   * @return {CuriousQuery} The query with the term appended.
   */
  CuriousQuery.prototype._append = function (
    termObject, relationship, constructor
  ) {
    this.terms.push(term);
    this.relationships.push(relationship);

    if (constructor) {
      this.objectFactories.push(_makeObjectFactory(constructor));
    }

    return this;
  };

  /**
   * Add a starting term to this query. Equivalent to passing parameters
   * directly to the constructor.
   *
   * @see _append
   */
  CuriousQuery.prototype.start = function (termString, relationship, constructor) {
    return this._append(new QueryTermFollow(termString), relationship, constructor);
  };

  /** Add an inner-join term to this query. @see _append */
  CuriousQuery.prototype.follow = function (termString, relationship) {
    return this._append(new QueryTermFollow(termString), relationship);
  };

  /** Add a filter term to this query. @see _append */
  CuriousQuery.prototype.having = function (termString, relationship) {
    return this._append(new QueryTermHaving(termString), relationship);
  };

  /** Add an exclude filter term to this query. @see _append */
  CuriousQuery.prototype.notHaving = function (termString, relationship) {
    return this._append(new QueryTermNotHaving(termString), relationship);
  };

  /** Add an outer-join term to this query. @see _append */
  CuriousQuery.prototype.with = function (termString, relationship, constructor) {
    return this._append(new QueryTermWith(termString), relationship, constructor);
  };

  /**
   * Specify the object constructor to use for the preceding term in the query.
   *
   * @param {function} curiousObjectClass A constructor to use when
   *                                      instantiating objects from the
   *                                      previous part of the query
   *
   * @return {CuriousQuery} The query object, with the new constructor data
   *                        stored internally
   */
  CuriousQuery.prototype.wrapWith = function (curiousObjectClass) {
    return this.wrapDynamically(_makeObjectFactory(curiousObjectClass));
  };

  /**
   * Specify the object factory function to use for the preceding term in the
   * query. Unlike wrapDynamically, which can work with traditional
   * constructors that do not return a value by default, this will only work
   * with factory functions that explicitly return an object.
   *
   * @param {function} factoryFunction  A factory function that returns an
   *                                    object of the desired wrapping class.
   *
   * @return {CuriousQuery} The query object, with the new constructor data
   *                        stored internally
   */
  CuriousQuery.prototype.wrapDynamically = function (factoryFunction) {
    if (this.objectFactories.length) {
      this.objectFactories[this.objectFactories.length - 1] = factoryFunction;
    } else {
      throw('Cannot specify type of object before starting a query');
    }

    return this;
  };

  /**
   * Set the parameters that this query will pass to its curious client when
   * perform is called.
   *
   * @param {Object} params An object of parameters to set. See the CuriousQ
   *                        documentation for a full description of these.
   *
   * @return {CuriousQuery} The query object with its curious client parameters
   *                        updated.
   */
  CuriousQuery.prototype.setParams = function (params) {
    this.params = params;
    return this;
  };

  /**
   * Set the existing objects that this query will use to link the returned
   * objects into.
   *
   * @param objs {Object[][]} The existing objects to set
   *
   * @return {CuriousQuery} The query object with its existing object set
   *                        updated.
   */
  CuriousQuery.prototype.setExistingObjects = function (objs) {
    this.existingObjects = objs;
    return this;
  };

  /**
   * Perform the query using a passed-in Curious client, such as jQuery's ajax,
   * or any other client that has asynchronous get/post request methods.
   *
   * @param {CuriousQ} A a Curious client object that will handle performing the
   *                   actual query.
   *
   * XXX change this?
   *
   * @return {promise} A promise XXX not implemented yet
   */
  CuriousQuery.prototype.perform = function (
    curiousClient, objectsCallback, treesCallback
  ) {
    var q = this.query();

    return curiousClient.get(
      q, this.relationships, this.objectFactories, this.params, this.existingObjects,
      objectsCallback, treesCallback
    );
  };

  /**
   * Return a function that will always construct an object of the specified
   * class, regardless of whether or not the passed-in constructor needs to
   * be called with `new` or not.
   *
   * @private
   * @param {function} objectClass The constructor that will be called with the
   *                               new keyword to construct the object.
   * @param {Object[]} constructorArgs An array of additional arguments that
   *                                   will be passed to the constructor.
   *
   * @return {function} A factory function that will return a new object
   *                    whenever called.
   */
  function _makeObjectFactory(objectClass, constructorArgs) {
    return function () {
      return new objectClass.call({}, constructorArgs);
    };
  }


  // CURIOUS OBJECTS

  /** Utilities for dealing with curious objects @namespace */
  var CuriousObjects = (function () {

    /**
     * Base (default) class for an object returned from a Curious query
     *
     * @param {Object} objectData A plain JavaScript object representing the
     *                            query data, as parsed from the returned JSON.
     * @class
     */
    function CuriousObject(objectData) {
      var newObject = this;

      // Special properties that aren't data-bearing, but are often convenient
      newObject.__url = null;
      newObject.__model = null;
      newObject.__dirty = false;

      // Copy over the object data to be properties of the new CuriousObject
      Object.keys(objectData).forEach(function (key) {
        newObject[key] = objectData[key];
      });

      return newObject;
    }

    /**
     * When a Curious query is performed, the returned data comes in a set of 3
     * arrays to save space: objects, fields, urls. Assemble that data into a
     * single array of objects, each of which has the appropriate fields. This
     * makes the data much more reasonable to work with.
     *
     * @private
     *
     * @param {Object<string,Array>} queryData
     *   A plain JavaScript object representing the query data, as parsed from
     *   the returned JSON. This format is not meant to be easy to use, but
     *   takes less space.
     * @param {string[]} queryData.fields The fields every object has.
     * @param {Array[]} queryData.objects
     *   An array of arrays, where each array is the values of a single object's
     *   properties, in the order specified by queryData.fields
     * @param {string[]} queryData.urls The url of every object, if they have one
     * @param {string} model The name of the Django model these objects come
     *                       from.
     * @param {function} customConstructor A constructor to use instead of the
     *                                     default CuriousObject constructor.
     *
     * @return {(CuriousObject|customConstructor)[]}
     * An array of objects, which contain the data described in queryData.
     */
    function _parseObjects(queryData, model, customConstructor) {
      var objects = [];

      if (queryData.objects instanceof Array) {

        queryData.objects.forEach(function (objectDataArray, objectIndex) {
          var url = queryData.urls[objectIndex];
          var objectData = {};
          var obj; // the final constructed object

          // Combine the data from the fields
          queryData.fields.forEach(function (fieldName, fieldIndex) {
            objectData[fieldName] = objectDataArray[fieldIndex];
          });

          if (customConstructor) {
            obj = new customConstructor(objectData);

            // We can't be sure that the custom constructor that was passed in
            // got all the fields assigned, so we should do it ourselves just
            // in case for any fields the constructor might have missed.
            queryData.fields.forEach(function (fieldName) {
              if (!obj.hasOwnProperty(fieldName)) {
                obj[fieldName] = objectData[fieldName];
              }
            });

            if (!obj.hasOwnProperty('__dirty')) {
              obj.__dirty = false;
            }

          } else {
            // The CuriousObject constructor does this automatically
            obj = new CuriousObject(objectData);
          }

          // Set the magic fields
          obj.__url = url;
          obj.__model = model;

          objects.push(obj);
        });
      }

      return objects;
    }

    /**
     * Get objects associated with each subquery. For each subquery, build a
     * hash of ID to object.
     *
     * If existing objects are specified, will build relationships using the
     * existing objects.
     *
     * @public
     *
     * @param {string[]} relationships
     *   The names of the relationships objects will have to one another.
     * @param {Object} queryJSONResponse
     *   An object of fields holding the query response, as returned and parsed
     *   directly from JSON without any post-processing.
     * @param {string} queryJSONResponse.computed_on
     *   The query timestamp.
     * @param {string} queryJSONResponse.last_model
     *   The model name of the last set of objects returned.
     * @param {Object[]} queryJSONResponse.results
     *   An array of objects containing Django object ids and other
     *   meta-information about the query; one element per model.
     * @param {string} queryJSONResponse.results[].model
     *   The model name for this part of the query.
     * @param {number} queryJSONResponse.results[].join_index
     *   The index of the model this model joins to.
     * @param {Array[]} queryJSONResponse.results[].objects
     *   The IDs of the objects returned by the query
     * @param {Object[]} queryJSONResponse.data
     *   An array of objects containing the other fields of the Django objects,
     *   more than just the IDs. @see _parseObjects for a description of this
     *   data in the queryData parameter.
     * @param {Object<number,Object>[]} existingObjects
     *   The existing objects. Each object in the array is a mapping of an id
     *   to its corresponding object.
     *
     * @return {{objects: Object[], trees: Object[]}
     *   The parsed objects. Trees holds any hierarchical relationships,
     *   for recursive queries.
     */
    function parse(
      relationships, customConstructors, queryJSONResponse, existingObjects
    ) {
      var combinedObjects = [];
      var trees = [];

      if (queryJSONResponse.data instanceof Array) {

        queryJSONResponse.data.forEach(function (queryData, queryIndex) {
          var queryObjects; // the objects parsed from this query
          var objectsByID = {};

          // Parse out the objects for this query, passing
          queryObjects = _parseObjects(
            queryData,

            queryJSONResponse.results[queryIndex].model,

            // Only pass in custom constructors if we need to
            (customConstructors instanceof Array)
              ? customConstructors[queryIndex]
              : undefined
          );

          queryObjects.forEach(function (object) {
            var id = object.id;

            if (
              existingObjects instanceof Array
              && existingObjects[queryIndex]
              && existingObjects[queryIndex].hasOwnProperty(id)
            ) {
              objectsByID[id] = existingObjects[queryIndex][id];
            } else {
              objectsByID[id] = object;
            }
          });

          combinedObjects.push(objectsByID);
          trees.push(null);
        });


        // For each subquery, add a relationship to the results of the next
        // subquery and then a reverse relationship
        queryJSONResponse.results.forEach(function (queryResult, queryIndex) {

          // An array of pairs: [objectID, srcObjectID], where
          // the srcObjectID points to the ID of the object that this
          // object is joined from (the 'source' of the join)
          var joinIDPairs = queryResult.objects;

          // A model-level join-index: shows which models are joined to
          // which other models.
          // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
          var joinIndex = queryResult.join_index;
          // jscs:enable

          var forwardRelationshipName = relationships[queryIndex];
          var reverseRelationshipName = relationships[joinIndex];

          var joinSourceObjects = combinedObjects[joinIndex];
          var joinDestinationObjects = combinedObjects[queryIndex];

          if (joinSourceObjects && joinDestinationObjects) {
            // Initialize empty arrays for relationships
            Object.keys(joinSourceObjects).forEach(function (id) {
              joinSourceObjects[id][forwardRelationshipName] = [];
            });

            Object.keys(joinDestinationObjects).forEach(function (id) {
              joinDestinationObjects[id][reverseRelationshipName] = [];
            });

            // Go through each of the join ID pairs, and make the equvalent
            // reference links in the corresponding object
            joinIDPairs.forEach(function (joinIDPair) {
              var id = joinIDPair[0];
              var srcID = joinIDPair[1]; // the ID of the parent
              var obj, srcObj; // the corresponding objects


              if (srcID) {
                obj = joinDestinationObjects[id];
                srcObj = joinSourceObjects[srcID];

                // Forward relationship from query to next query
                srcObj[forwardRelationshipName].push(obj);
                // Reverse relationship to previous query
                obj[reverseRelationshipName].push(srcObj);
              }
            });
          }

          // Set the trees (for hierarchical, recursive queries)
          trees[queryIndex] = queryJSONResponse.results[queryIndex].tree;
        });
      }

      return { objects: combinedObjects, trees: trees };
    }

    /**
     * Utility for pulling out all the values contained in an object, in
     * the same order as its keys would come out.
     *
     * @public
     *
     * @param {Object} obj The object to look at.
     *
     * @return {Array} The values of the object, whatever it holds.
     */
    function values(obj) {
      return Object.keys(obj).map(function (key) { return obj[key]; });
    }

    /**
     * Take an array of objects that have 'id' fields, and group them into a
     * single object using that field.
     *
     * @public
     *
     * @param {Object[]} arrayOfObjects The array to turn into an object.
     *
     * @return {Array} The values of the object, whatever it holds.
     */
    function groupObjectsByID(arrayOfObjects) {
      var objectsByID = {};

      arrayOfObjects.forEach(function (object) {
        if (object.id === 0 || object.id) {
          objectsByID[object.id] = object;
        }
      });

      return objectsByID;
    }

    /**
     * Take an array of objects that have 'id' fields and pull those fields
     * out into a list of only one ID each.
     *
     * Preserves order.
     *
     * @public
     *
     * @param {Object[]} objects An array of objects with the id property.
     *
     * @return {number[]} The set of IDs, with duplicates removed, in the same
     *                    order as the input object list.
     */
    function idList(objects) {
      var uniqueIDs = [];
      var idSet = {};

      objects.forEach(function (object) {
        if (object.hasOwnProperty('id')) {
          var id = object.id;

          if (!idSet[id]) {
            uniqueIDs.push(id);
          }

          idSet[id] = true;
        }
      });

      return uniqueIDs;
    }

    /**
     * Take an array of objects that have 'id' fields and pull those fields
     * out into a comma-separated string.
     *
     * Preserves order.
     *
     * @public
     *
     * @param {Object[]} arrayOfObjects The array to turn into an object.
     *
     * @return {string} A comma-separated string containing the objects' IDs,
     *                  with duplicates removed, in the same order as the input
     *                  object list.
     */
    function idString(objects) {
      var ids = idList(objects);
      return ids.join(',');
    }

    return {
      parse: parse,
      values: values,
      groupObjectsByID: groupObjectsByID,
      idList: idList,
      idString: idString,
    };

  }());

  // QUERY CLIENT

  /**
   * Rearrange the results from an array of arrays of objects to an object,
   * where each array of objects is named by its appropriate relationship name.
   *
   * @param {string[]} relationships The relationship names
   * @param {Array<Object>[]} objects An array of arrays of objects that
   *                                  contains the objects from each
   *                                  relationship.
   *
   * @return {Object<string,Array>}
   */
  function _convertResultsToOutput(relationships, objects) {
    var output = {};

    objects.forEach(function (object, objectIndex) {
      var relationship = relationships[objectIndex];
      var uniqueIndex = 2;

      // If there is already a key in the object with the existing relationship
      // name, add a number after it to make it unique.
      while (output.hasOwnProperty(relationship)) {
        relationship = relationships[objectIndex] + String(uniqueIndex);
        uniqueIndex++;
      }

      output[relationship] = CuriousObjects.values(object);
    });

    return output;
  }

  /**
   * Get the final args to send to the Curious server, after filtering down
   * through all of the defaults.
   *
   * @private
   *
   * @param {Object} queryArgs Query-specific args.
   * @param {Object} appDefaultArgs Client-specific args.
   *
   * @return {Object} The args, with all defaults filled in hierarchially.
   */
  function _getArgs(queryArgs, appDefaultArgs) {
    var args = {x: 0, fk: 0}; // lowest-priority default args
    var immutableArgs = {d: 1}; // these are always set, no matter what

    if (appDefaultArgs) {
      Object.keys(appDefaultArgs).forEach(function (key) {
        args[key] = appDefaultArgs[kkey];
      });
    }

    if (queryArgs) {
      Object.keys(queryArgs).forEach(function (key) {
        args[key] = queryArgs[kkey];
      });
    }

    Object.keys(immutableArgs).forEach(function (key) {
      args[k] = immutableArgs[k];
    });

    return args;
  }

  /**
   * In an array of array of objects, group the arrays by ID.
   *
   * @private
   *
   * @param {Array<Object>[]} arrayOfArraysOfObjects The input array.
   *
   * @return {{id: Object}[]} The output: an array of objects grouped by ID.
   */
  function _groupArraysOfObjectsByID(arrayOfArraysOfObjects) {
    return arrayOfArraysOfObjects.map(function (arrayOfObjects) {
      if (arrayOfObjects) {
        return CuriousObjects.groupObjectsByID(arrayOfArraysOfObjects[i]);
      } else {
        return null;
      }
    });
  }

  /**
   * Tool for making a curious query and returning parsed objects.
   *
   * @class
   * @public
   *
   * @param {string} curiousURL The URL of the Curious server
   * @param {function (string, object): Promise} request
   *  A function that makes a POST request and returns a promise (a thenable).
   *  Examples are jQuery.post, axios.post, and Angular's $http.post. Any
   *  function that meets the signature, makes a POST request, and returns a
   *  thenable will work.
   * @param {Object} appDefaultArgs Default parameters to send to the serever
   *                                with every query performed by this client.
   * @param {boolean} quiet Unless true, log every query to the console.
   *
   * @return {Object} A client object with a single get method.
   */
  var CuriousClient = function (curiousURL, request, appDefaultArgs, quiet) {

    /**
     * Perform a Curious query and return back parsed objects.
     *
     * @param {string} q The query string.
     * @param {string[]} relationships The names of relationships between each
     *                                 joined set of objects.
     * @param {Array<?function>} constructors An array of constructors for any
     *                                        custom classes, or null for the
     *                                        default.
     * @param {Object} params Query-specific parameters for the request.
     * @param {Array<Object>[]} existingObjects Objects that already exist to be
     *                                          linked into the results returned
     *                                          by this query.
     *
     * @return {Promise} A promise that resolves to an object:
     *                   {objects: the fully parsed objects,
     *                    trees: the tree ID structure for recursive queries}
     */
    function get(q, relationships, constructors, params, existingObjects) {
      var args;

      if (!quiet) {
        console.warn(q);
      }

      if (existingObjects) {
        existingObjects = _groupArraysOfObjectsByID(existingObjects);
      }

      args = _getArgs(params, appDefaultArgs);
      args.q = q;

      return request(curiousURL, args)
        .then(function (response) {
          var parsedResult = CuriousObjects.parse(
            relationships, constructors, response.result, existingObjects
          );

          return {
            objects: _convertResultsToOutput(relationships, parsedResult.objects),
            trees: parsedResult.trees,
          };
        });
    }

    return { get: get };
  };

  // Exports: browser/node
  var ex;
  if (typeof window !== 'undefined' && window) {
    ex = window;
  } else if (typeof exports !== 'undefined' && exports) {
    ex = exports;
  }

  ex.CuriousObjects = CuriousObjects;
  ex.CuriousClient = CuriousClient;
  ex.CuriousQuery = CuriousQuery;

  return ex;
})();
// vim: sw=2 ts=2 sts=2 et
