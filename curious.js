/***
 * Module for curious client-side query construction and JSON parsing.
 *
 * @module curious
 */
(function () {
  'use strict';
  // QUERY TERMS

  /**
   * Abstract base class for query terms.
   *
   * @private
   * @abstract
   * @class
   * @alias module:curious~QueryTerm
   *
   * @param {string} term The internal term text to use.
   */
  var QueryTerm = function (term) {
    /** The term contents
    * @readonly
    * @public
    */
    this.term = function () { return term; };
    return this;
  };

  /**
   * Return the term contents as they belong in a query, wrapped with parens and
   * other operators
   *
   * @public
   *
   * @return {string} The term contents, formatted.
   */
  QueryTerm.prototype.toString = function () { return this.term(); };

  /**
   * Determine whether or not the terms sticks implicit joins into adjacent
   * terms.
   *
   * @public
   *
   * @return {boolean}
   *   True if the term implicitly joins with its following term. True by
   *   default.
   */
  QueryTerm.prototype.leftJoin = function () { return false; };

  /**
  * Determine whether or not the term is a conditional and does not affect
  * returned results.
  *
  * @public
  *
  * @return {boolean}
  *   True if term is a conditional.
  */
  QueryTerm.prototype.conditional = function () { return false; };

  /**
   * Make a term that follows the query chain.
   *
   * @private
   * @class
   * @extends {module:curious~QueryTerm}
   * @alias module:curious~QueryTermFollow
   */
  var QueryTermFollow = function (term) {
    QueryTerm.call(this, term);

    return this;
  };
  QueryTermFollow.prototype = new QueryTerm();

  /**
   * Make a term that performs a filter.
   *
   * @private
   * @class
   * @extends {module:curious~QueryTerm}
   * @alias module:curious~QueryTermHaving
   */
  var QueryTermHaving = function (term) {
    QueryTerm.call(this, term);

    return this;
  };
  QueryTermHaving.prototype = new QueryTerm();
  
  QueryTermHaving.prototype.conditional = function () { return true; };

  QueryTermHaving.prototype.toString = function () {
    return '+(' + this.term() + ')';
  };

  /**
   * Make a term that performs a negative filter.
   *
   * @class
   * @extends {module:curious~QueryTerm}
   */
  var QueryTermNotHaving = function (term) {
    QueryTerm.call(this, term);

    return this;
  };
  QueryTermNotHaving.prototype = new QueryTerm();

  QueryTermNotHaving.prototype.conditional = function () { return true; };

  QueryTermNotHaving.prototype.toString = function () {
    return '-(' + this.term() + ')';
  };

  /**
   * Make a term that performs an outer join.
   *
   * @private
   * @class
   * @extends {module:curious~QueryTerm}
   * @alias module:curious~QueryTermWith
   */
  var QueryTermWith = function (term) {
    QueryTerm.call(this, term);

    return this;
  };
  QueryTermWith.prototype = new QueryTerm();
  
  QueryTermWith.prototype.leftJoin = function () { return true; };

  QueryTermWith.prototype.toString = function () {
    return '?(' + this.term() + ')';
  };


  // QUERY OBJECT

  /**
   * <p>Make a Curious query from constituent parts, using a chain of method
   * calls to a single object.</p>
   *
   * <p>CuriousQuery objects are an object-based representation of a Curious
   * query string to make passing around parts of a query and assembling
   * queries easier.</p>
   *
   * <p>The result of curious queries will be an object containing arrays of
   * objects, as specified in the Curious query. This would be analogous to what
   * a Django QuerySet might look like on the back end.</p>
   *
   * <p>If there is more than one kind of object returned by the query and the
   * query specifies some kind of relationship between the data in the objects
   * (for example, Reactions that have Datasets), the returned objects will have
   * attributes that point to their related objects. The names of these
   * relationships are provided as a user-specified parameter.</p>
   *
   * <p>You construct CuriousQuery objects with a repeated chain of function
   * calls on a core object, CuriousQuery object, much like in jQuery, or
   * <code>_.chain()</code>. Every stage of the chain specifies a new term in
   * the query, and a relationship name as a string. The stages can also take
   * an optional third parameter that will specify the class of the constructed
   * objects (insead of just <code>CuriousObject</code>).</p>
   *
   * <p>The initial Curious term happens either by passing parameters directly
   * to the construtor, or by calling <code>.start()</code>.</p>
   *
   * @class
   * @alias module:curious.CuriousQuery
   *
   * @param {string} [initialTermString]
   *   The string for the starting term
   * @param {string} [initialRelationship]
   *   The starting term's relationship
   * @param {function} [initialObjectClass]
   *   A custom object class constructor for the starting term
   *
   * @return {CuriousQuery} The newly constructed object.
   *
   * @example
   *   // Explicitly set start, wrapWith classes
   *   var q = (new curious.CuriousQuery())
   *     .start('Experiment(id=302)', 'experiment')
   *     .follow('Experiment.reaction_set', 'reactions')
   *     .follow('Reaction.dataset_set', 'dataset').wrapWith(Dataset)
   *     .follow('Dataset.attachment_set');
   *
   *  q.query() ==
   *    'Experiment(id=302), Experiment.reaction_set, '
   *    + 'Reaction.dataset_set, Dataset.attachment_set'
   *
   * @example
   *   // Terser version of the same query above
   *   var q = new curious.CuriousQuery('Experiment(id=302)', 'experiment')
   *     .follow('Experiment.reaction_set', 'reactions')
   *     .follow('Reaction.dataset_set', 'dataset', Dataset)
   *     .follow('Dataset.attachment_set');
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
   * Generate the constructed query string represented by this object.
   *
   * @return {string} The fully constructed query.
   */
  CuriousQuery.prototype.query = function () {
    var query = '';
    var terms = [];

    // Flatten all terms and arrays of terms into a single array.
    this.terms.forEach(function (term) {
      terms = terms.concat(term);
    });

    terms.forEach(function (term, termIndex) {
      // The first term just gets added directly: it's the starting model or
      // object. The following terms either do or do not have an implicit inner
      // join between them. If they do not have an implicit inner join,
      // commas are inserted to ensure that the objects that correspond to
      // those terms are returned
      if (termIndex > 0) {
        if (term.conditional())
          query += ' ';
        else if (
          !term.conditional()
          && !terms[termIndex - 1].leftJoin()
          && !term.leftJoin()
        ) {
          query += ', ';
        } else {
          query += ' ';
        }
      }

      query += term;
    });

    return query;
  };

  /**
   * Extend this query object with another query object: Return a new query
   * chain with the current query chain's terms followed
   * by the other query chain's terms.
   *
   * @param {CuriousQuery} extensionQueryObject The query object being added
   * @return {CuriousQuery} The combined query
   */
  CuriousQuery.prototype.extend = function (extensionQueryObject) {
    var queryObject = this;

    extensionQueryObject.terms.forEach(function (term, termIndex) {
      queryObject._addTerm(
        term,
        extensionQueryObject.relationships[termIndex],
        extensionQueryObject.objectFactories[termIndex]
      );
    });

    return queryObject;
  };

  /**
   * Return a deep copy of the current query object.
   *
   * @return {CuriousQuery}
   *   A new CuriousQuery object constaining the same terms, relationships,
   *   constructors
   */
  CuriousQuery.prototype.clone = function () {
    var clonedObject;

    clonedObject = new CuriousQuery();
    clonedObject.extend(this);

    // One-level-deep copies of params and existing objects
    clonedObject.setParams(this.params);
    clonedObject.setExistingObjects(this.existingObjects);

    return clonedObject;
  };

  /**
   * <p>Add another term to this query: generic method.</p>
   *
   * <p>Consumers should not use this method, as they do not have access to the
   * {@link module:curious~QueryTerm} classes.</p>
   *
   * @private
   *
   * @param {QueryTerm|Array<QuerryTerm>} termObject
   *   A {@link module:curious~QueryTerm} object to append to the term, or an
   *   array of them
   * @param {string} relationship
   *   The name of this term in inter-term relationships
   * @param {function} [customConstructor]
   *   A custom constructor for the resulting objects, if this part of the
   *   query returns new objects
   *
   * @return {CuriousQuery} The query object, with the new term added
   */
  CuriousQuery.prototype._addTerm = function (
    termObject, relationship, customConstructor
  ) {
    // Ensure that objectFactories, relationships, and terms always have the
    // same number of elements.

    if (termObject && relationship) {
      this.terms.push(termObject);
      this.relationships.push(relationship);
    } else {
      throw (
        'Must specify a term and a relationship to append to: ('
        + this.query()
        + ')'
      );
    }

    if (customConstructor) {
      this.objectFactories.push(_makeObjectFactory(customConstructor));
    } else {
      this.objectFactories.push(null);
    }

    return this;
  };

  /**
   * <p>Append more text to the end of the last term: generic method.</p>
   *
   * <p>Consumers should not use this method, as they do not have access to the
   * {@link module:curious~QueryTerm} classes.</p>
   *
   * @private
   *
   * @param {QueryTerm|Array<QueryTerm>} termObject
   *   A {@link module:curious~QueryTerm} object (or an array of them), to
   *   append to the previous term.
   *
   * @return {CuriousQuery}
   *   The query object, with the term object's string representation appended
   *   to the previous term
   */
  CuriousQuery.prototype._appendToPreviousTerm = function (termObject) {
    var lastTerm;

    if (this.terms.length) {
      lastTerm = this.terms[this.terms.length - 1];

      // If the last term has not already been turned into an array, prep it
      // first
      if (!(lastTerm instanceof Array)) {
        lastTerm = [lastTerm];
      }

      lastTerm = lastTerm.concat(termObject);

      // modify the actual terms of the object, since lastTerm is just a shallow
      // reference copy
      this.terms[this.terms.length - 1] = lastTerm;
    } else {
      throw('Must add terms before appending "' + termObject + '" to them.');
    }

    return this;
  };

  /**
   * Add a starting term to this query. Equivalent to passing parameters
   * directly to the constructor.
   *
   * @param {string} termString
   *   The contents of the starting term.
   * @param {string} relationship
   *   The name of this term in inter-term relationships
   * @param {function} [customConstructor]
   *   A custom constructor for the resulting objects, if this part of the
   *   query returns new objects
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.start = function (termString, relationship, customConstructor) {
    return this._addTerm(new QueryTermFollow(termString), relationship, customConstructor);
  };

  /**
   * Add an inner-join term to this query.
   *
   * @param {string} termString
   *   The contents of the starting term.
   * @param {string} relationship
   *   The name of this term in inter-term relationships
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.follow = function (termString, relationship, customConstructor) {
    return this._addTerm(new QueryTermFollow(termString), relationship, customConstructor);
  };

  /**
   * Add a filter term to this query.
   *
   * @param {string} termString
   *   The subquery to filter by.
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.having = function (termString) {
    return this._appendToPreviousTerm(new QueryTermHaving(termString));
  };

  /**
   * Add an exclude filter term to this query.
   *
   * @param {string} termString
   *   The subquery to filter by.
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.notHaving = function (termString) {
    return this._appendToPreviousTerm(new QueryTermNotHaving(termString));
  };

  /**
   * Add an outer-join term to this query.
   *
   * @param {string} termString
   *   The contents of the starting term.
   * @param {string} relationship
   *   The name of this term in inter-term relationships
   * @param {function} [customConstructor]
   *   A custom constructor for the resulting objects, if this part of the
   *   query returns new objects
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.with = function (termString, relationship, customConstructor) {
    return this._addTerm(new QueryTermWith(termString), relationship, customConstructor);
  };

  /**
   * Specify the object constructor to use for the preceding term in the query.
   *
   * @param {function} customConstructor
   *   A constructor to use when instantiating objects from the previous part of
   *   the query
   *
   * @return {CuriousQuery}
   *   The query object, with the new constructor data stored internally
   */
  CuriousQuery.prototype.wrapWith = function (customConstructor) {
    return this.wrapDynamically(_makeObjectFactory(customConstructor));
  };

  /**
   * Specify the object factory function to use for the preceding term in the
   * query. Unlike wrapDynamically, which can work with traditional
   * constructors that do not return a value by default, this will only work
   * with factory functions that explicitly return an object.
   *
   * @param {function (Object): Object} factoryFunction
   *   A factory function that returns an object of the desired wrapping class.
   *
   * @return {CuriousQuery}
   *   The query object, with the new constructor data stored internally
   */
  CuriousQuery.prototype.wrapDynamically = function (factoryFunction) {
    if (this.objectFactories.length) {
      this.objectFactories[this.objectFactories.length - 1] = factoryFunction;
    } else {
      throw('Cannot specify custom object constructor before starting a query');
    }

    return this;
  };

  /**
   * Set the parameters that this query will pass to its curious client when
   * perform is called.
   *
   * @param {Object} params
   *   An object of parameters to set. See
   *   {@link module:curious.CuriousClient#performQuery} for a full description of the
   *   parameters.
   *
   * @return {CuriousQuery}
   *   The query object with its curious client parameters updated.
   */
  CuriousQuery.prototype.setParams = function (params) {
    var queryObject = this;

    if (params instanceof Object) {
      if (!queryObject.params) {
        queryObject.params = {};
      }

      Object.keys(params).forEach(function (key) {
        queryObject.params[key] = params[key];
      });
    }
    return queryObject;
  };

  /**
   * Set the existing objects that this query will use to link the returned
   * objects into.
   *
   * @param {Object[]} objs The existing objects to set
   *
   * @return {CuriousQuery} The query object with its existing object set
   *                        updated.
   */
  CuriousQuery.prototype.setExistingObjects = function (objs) {
    var queryObject = this;

    if (objs && objs.forEach) {
      queryObject.existingObjects = [];

      objs.forEach(function (existingObject, ix) {
        queryObject.existingObjects[ix] = existingObject;
      });
    }

    return queryObject;
  };

  /**
   * Perform the query using a passed-in Curious client, such as jQuery's ajax,
   * or any other client that has an asynchronous <code>POST</code> request
   * methods.
   *
   * @param {CuriousClient} curiousClient
   *   A CuriousClient object that will handle performing the actual query.
   *
   * @return {Promise}
   *   A promise, as returned by {@link module:curious.CuriousClient#performQuery}
   *
   */
  CuriousQuery.prototype.perform = function (curiousClient) {
    var q = this.query();

    return curiousClient.performQuery(
      q, this.relationships, this.objectFactories, this.params, this.existingObjects
    );
  };

  /**
   * Return a function that will always construct an object of the specified
   * class, regardless of whether or not the passed-in constructor needs to
   * be called with `new` or not.
   *
   * @private
   *
   * @param {function} customConstructor
   *   The constructor that will be called with the new keyword to construct
   *   the object.
   *
   * @return {function} A factory function that will return a new object
   *                    whenever called.
   */
  function _makeObjectFactory(customConstructor) {
    var CustomConstructorClass = customConstructor;
    return function () {
      return new CustomConstructorClass();
    };
  }


  // CURIOUS OBJECTS

  /**
   * Utilities for dealing with curious objects
   * @namespace
   * @alias module:curious.CuriousObjects
   */
  var CuriousObjects = (function () {

    /**
     * Base (default) class for an object returned from a Curious query
     *
     * @private
     * @class
     * @memberof module:curious.CuriousObjects
     *
     * @param {Object} objectData
     *   A plain JavaScript object representing the query data, as parsed from
     *   the returned JSON.
     *
     */
    function CuriousObject(objectData) {
      var newObject = this;

      // Special properties that aren't data-bearing, but are often convenient
      newObject.__url = null;
      newObject.__model = null;

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
     * @memberof module:curious.CuriousObjects
     *
     * @param {Object<string,Array>} queryData
     *   A plain JavaScript object representing the query data, as parsed from
     *   the returned JSON. This format is not meant to be easy to use, but
     *   takes less space.
     * @param {string[]} queryData.fields
     *   The fields every object has.
     * @param {Array[]} queryData.objects
     *   An array of arrays, where each array is the values of a single object's
     *   properties, in the order specified by <code>queryData.fields</code>
     * @param {string[]} queryData.urls
     *   The url of every object, if they have one
     * @param {string} model
     *   The name of the Django model these objects come from
     * @param {function} customConstructor
     *   A constructor to use instead of the default CuriousObject constructor.
     *
     * @return {Array<CuriousObject|CustomConstructorClass>}
     *   An array of objects, which contain the data described in queryData.
     */
    function _parseObjects(queryData, model, customConstructor) {
      var objects = [];

      if (queryData.objects instanceof Array) {

        queryData.objects.forEach(function (objectDataArray, objectIndex) {
          var url = queryData.urls[objectIndex];
          var objectData = {};
          var obj; // the final constructed object
          var CustomConstructorClass = customConstructor; // Make a properly-capped version

          // Combine the data from the fields
          queryData.fields.forEach(function (fieldName, fieldIndex) {
            objectData[fieldName] = objectDataArray[fieldIndex];
          });

          if (customConstructor) {
            obj = new CustomConstructorClass(objectData);

            // We can't be sure that the custom constructor that was passed in
            // got all the fields assigned, so we should do it ourselves just
            // in case for any fields the constructor might have missed.
            queryData.fields.forEach(function (fieldName) {
              // NOTE: don't check for obj.hasOwnProperty - we actually want to
              // override existing fields in obj
              obj[fieldName] = objectData[fieldName];
            });

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
     * @memberof module:curious.CuriousObjects
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
     *   more than just the IDs. See _parseObjects for a description of this
     *   data in the queryData parameter.
     * @param {Array<Object<number,Object>>} existingObjects
     *   The existing objects. Each object in the array is a mapping of an id
     *   to its corresponding object.
     *
     * @return {{objects: Object[], trees: Object[]}
     *   The parsed objects. <code>trees</code> holds any hierarchical
     *   relationships, for recursive queries.
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

                if (srcObj && obj) {
                  // Forward relationship from query to next query
                  srcObj[forwardRelationshipName].push(obj);
                  // Reverse relationship to previous query
                  obj[reverseRelationshipName].push(srcObj);
                }
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
     * @memberof module:curious.CuriousObjects
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
     * @memberof module:curious.CuriousObjects
     *
     * @param {Object[]} arrayOfObjects The array to turn into an object
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
     * <p>Take an array of objects that have <code>id</code> fields and pull
     * those fields out into a list of only one ID each.</p>
     *
     * <p>Preserves order.</p>
     *
     * @memberof module:curious.CuriousObjects
     *
     * @param {Object[]} objects
     *   An array of objects with the <code>id</code> property
     *
     * @return {number[]}
     *   The set of IDs, with duplicates removed, in the same order as the
     *   input object list
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
     * <p>Take an array of objects that have <code>id</code> fields and pull
     * those fields out into a comma-separated string.</p>
     *
     * <p>Preserves order.</p>
     *
     * @memberof module:curious.CuriousObjects
     *
     * @param {Object[]} arrayOfObjects The array to turn into an object
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
   * @param {Array<Array<Object>>} objects The objects from each relationship
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
   * @param {Object} queryArgs Query-specific args
   * @param {Object} clientDefaultArgs Client-specific args
   *
   * @return {Object} The args, with all defaults filled in hierarchially
   */
  function _getArgs(queryArgs, clientDefaultArgs) {
    var args = {x: 0, fk: 0}; // lowest-priority default args
    var immutableArgs = {d: 1}; // these are always set, no matter what

    // Override lowest-priority default args with client-level defaults
    if (clientDefaultArgs) {
      Object.keys(clientDefaultArgs).forEach(function (key) {
        args[key] = clientDefaultArgs[key];
      });
    }

    // Override app-level defaults with query-level args
    if (queryArgs) {
      Object.keys(queryArgs).forEach(function (key) {
        args[key] = queryArgs[key];
      });
    }

    // Make sure that the immutable args are always set to their required values
    Object.keys(immutableArgs).forEach(function (key) {
      args[key] = immutableArgs[key];
    });

    return args;
  }

  /**
   * Given an array of array of objects, group each of the arrays of objects by
   * ID
   *
   * @param {Aray<Array<Object>>} arrayOfArraysOfObjects
   *   An array of arrays of objects to group
   *
   * @return {Array<Object>}
   *   Each object corresponds to its array above, but now grouped by ID
   */
  function _groupArraysOfObjectsByID(arrayOfArraysOfObjects) {
    return arrayOfArraysOfObjects.map(function (arrayOfObjects) {
      if (arrayOfObjects) {
        return CuriousObjects.groupObjectsByID(arrayOfObjects);
      } else {
        return null;
      }
    });
  }

  /**
   * Tool for making a curious query and returning parsed objects.
   *
   * @class
   * @alias module:curious.CuriousClient
   *
   * @param {string} curiousURL
   *   The URL of the Curious server
   * @param {function (string, Object): Promise} request
   *   <p>A function that makes a <code>POST</code> request and returns a promise
   *   (a thenable). Examples are <code>jQuery.post</code>,
   *   <code>axios.post</code>, and Angular's <code>$http.post</code>.</p>
   *
   *   <p>Any function that meets the signature, makes a <code>POST</code> request and
   *   returns a thenable that resolves to the parsed JSON of the curious
   *   server's response will work.</p>
   * @param {Object} clientDefaultArgs
   *   Default parameters to send to the serever with every query performed by
   *   this client; see {@link module:curious.CuriousClient#performQuery} for an
   *   explanation of what each parameter means.
   * @param {boolean} quiet
   *   Unless true, log every query to the console.
   *
   * @return {{performQuery: function}}
   *   A client object with a single performQuery method.
   */
  var CuriousClient = function (curiousURL, request, clientDefaultArgs, quiet) {

    return {
      /**
       * Perform a Curious query and return back parsed objects.
       *
       * @memberof module:curious.CuriousClient
       *
       * @param {string} q
       *   The query string.
       * @param {string[]} relationships
       *   The names of relationships between each joined set of objects.
       * @param {Array<?function>} constructors
       *   An array of constructors for any custom classes, or null for the
       *   default.
       * @param {Object} params
       *   Query-specific parameters for the request
       * @param {boolean} [params.x]
       *   Whether or not to ignore excludes; defaults to false
       * @param {boolean} [params.c]
       *   Whether or not to just do a check of the query syntax; defaults to
       *   false
       * @param {boolean} [params.d]
       *   Whether or not return the object data, or just return ids; always
       *   forced to be true for the JavaScript client
       * @param {boolean} [params.fk]
       *   Whether or not follow foreign keys: if false, foregin keys will be
       *   IDs, as expecte. If true, foreign keys will be 4-member arrays
       *   that include the ID, name, and URL of the object being pointed to.
       *   Defaults to false.
       * @param {boolean} [params.r]
       *   If true, force a refresh of the data not from cache; defaults to
       *   false.
       * @param {boolean} [params.fc]
       *   If true, force using the cached data; defaults to false.
       * @param {string} [params.app]
       *   If provided, the name of the app, to use for cache key construction.
       * @param {Array<Array<Object>>} existingObjects
       *   Objects that already exist to be linked into the results returned by
       *   this query.
       *
       * @return {Promise<{objects: Array, trees: Array}>}
       *   A promise that resolves to an object containing the parsed objects
       *   from the query, and a tree structure that relates IDs for recursive
       *   queries.
       */
      performQuery: function (q, relationships, constructors, params, existingObjects) {
        var args;

        if (!quiet) {
          console.info(q);
        }

        if (existingObjects) {
          existingObjects = _groupArraysOfObjectsByID(existingObjects);
        }

        args = _getArgs(params, clientDefaultArgs);
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
      },
    };
  };

  CuriousClient.axios_post = function(axios) {
    // axios returns the server's response nested within an object
    // (response.data); here we return a tiny filter function to pull that
    // server response out
    return function (url, args) {
      return axios.post(url, args).then(function (response) { return response.data; });
    };
  };

  // Export either to browser window or CommonJS module
  var ex;
  if (typeof window !== 'undefined' && window) {
    ex = window;
  } else if (typeof exports !== 'undefined' && exports) {
    ex = exports;
  } else if (typeof self !== 'undefined' && self) {
    ex = self;
  }

  ex.CuriousObjects = CuriousObjects;
  ex.CuriousClient = CuriousClient;
  ex.CuriousQuery = CuriousQuery;

  return ex;
})();
// vim: sw=2 ts=2 sts=2 et
