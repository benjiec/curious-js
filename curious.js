/* global define */
/**
 * curious.js - JavaScript consumer code for Curious APIs.
 *
 * Copyright (c) 2015 Ginkgo BIoworks, Inc.
 * @license MIT
 */
(function _umd(global, factory) {
  // UMD Format for exports. Works with all module systems: AMD/RequireJS, CommonJS, and global
  var mod;

  // AMD
  if (typeof define === 'function' && define.amd) {
    define('curious', ['exports'], factory);
  } else if (typeof exports !== 'undefined') {
    factory(exports);
  } else {
    mod = {
      exports: {},
    };

    factory(mod.exports);
    global.curious = mod.exports;
  }
})(this, function _curiousUmdFactory(exports) {
  /**
   * Curious JavaScript client and query construction
   *
   * @module curious
   */

  'use strict';

  // For node.js and CommonJS
  Object.defineProperty(exports, '__esModule', { value: true });

  // QUERY TERMS

  /**
   * Abstract base class for query terms
   *
   * @private
   * @abstract
   * @class
   * @alias module:curious~QueryTerm
   *
   * @param {string} term The internal term text to use
   */
  function QueryTerm(term) {
    /**
     * The term contents
     *
     * @method term
     * @readonly
     * @public
     *
     * @return {string} The term contents
     */
    this.term = function _term() { return term; };

    return this;
  }

  /**
   * Return the term contents as they belong in a query, wrapped with parens and
   * other operators.
   *
   * @public
   *
   * @return {string} The term contents, formatted
   */
  QueryTerm.prototype.toString = function toString() { return this.term(); };

  /**
   * Determine whether or not the terms sticks implicit joins into adjacent
   * terms.
   *
   * @public
   *
   * @return {boolean}
   *   True if the term implicitly joins with its following term. True by
   *   default
   */
  QueryTerm.prototype.leftJoin = function leftJoin() { return false; };

  /**
  * Determine whether or not the term is a conditional and does not affect
  * returned results.
  *
  * @public
  *
  * @return {boolean}
  *   True if term is a conditional
  */
  QueryTerm.prototype.conditional = function conditional() { return false; };

  /**
   * Make a term that follows the query chain
   *
   * @private
   * @class
   * @extends {module:curious~QueryTerm}
   * @alias module:curious~QueryTermFollow
   *
   * @param {string} term The term contents
   */
  function QueryTermFollow(term) {
    QueryTerm.call(this, term);

    return this;
  }
  QueryTermFollow.prototype = new QueryTerm();

  /**
   * Make a term that performs a filter.
   *
   * @private
   * @class
   * @extends {module:curious~QueryTerm}
   * @alias module:curious~QueryTermHaving
   *
   * @param {string} term The term contents
   */
  function QueryTermHaving(term) {
    QueryTerm.call(this, term);

    return this;
  }
  QueryTermHaving.prototype = new QueryTerm();

  QueryTermHaving.prototype.conditional = function conditional() { return true; };

  QueryTermHaving.prototype.toString = function toString() { return '+(' + this.term() + ')'; };

  /**
   * Make a term that performs a negative (exclusive) filter.
   *
   * @private
   * @class
   * @extends {module:curious~QueryTerm}
   * @alias module:curious~QueryTermHaving
   *
   * @param {string} term The term contents
   */
  function QueryTermNotHaving(term) {
    QueryTerm.call(this, term);

    return this;
  }
  QueryTermNotHaving.prototype = new QueryTerm();

  QueryTermNotHaving.prototype.conditional = function conditional() { return true; };

  QueryTermNotHaving.prototype.toString = function toString() { return '-(' + this.term() + ')'; };

  /**
   * Make a term that performs an outer join.
   *
   * @private
   * @class
   * @extends {module:curious~QueryTerm}
   * @alias module:curious~QueryTermWith
   *
   * @param {string} term The term contents
   */
  function QueryTermWith(term) {
    QueryTerm.call(this, term);

    return this;
  }
  QueryTermWith.prototype = new QueryTerm();

  QueryTermWith.prototype.leftJoin = function leftJoin() { return true; };

  QueryTermWith.prototype.toString = function toString() { return '?(' + this.term() + ')'; };


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
   * @param {string=} initialTermString
   *   The string for the starting term
   * @param {string=} initialRelationship
   *   The starting term's relationship
   * @param {function(Object)=} initialObjectClass
   *   A custom object class constructor for the starting term
   *
   * @return {CuriousQuery} The newly constructed object
   *
   * @example
   * // Explicitly set start, wrapWith classes
   * var q = (new curious.CuriousQuery())
   *   .start('Experiment(id=302)', 'experiment')
   *   .follow('Experiment.reaction_set', 'reactions')
   *   .follow('Reaction.dataset_set', 'dataset').wrapWith(Dataset)
   *   .follow('Dataset.attachment_set');
   *
   * q.query() ==
   *   'Experiment(id=302), Experiment.reaction_set, '
   *   + 'Reaction.dataset_set, Dataset.attachment_set'
   *
   * @example
   * // Terser version of the same query above
   * var q = new curious.CuriousQuery('Experiment(id=302)', 'experiment')
   *   .follow('Experiment.reaction_set', 'reactions')
   *   .follow('Reaction.dataset_set', 'dataset', Dataset)
   *   .follow('Dataset.attachment_set');
   */
  function CuriousQuery(
    initialTermString, initialRelationship, initialObjectClass
  ) {
    this.terms = [];
    this.relationships = [];
    this.objectFactories = [];
    this.params = null;
    this.existingObjects = null;  // array of object arrays

    // then-style callback pairs to attach to the end of the promise when the query is performed
    this.thens = [];

    if (initialTermString && initialRelationship) {
      this.start(initialTermString, initialRelationship, initialObjectClass);
    }

    return this;
  }

  /**
   * Generate the constructed query string represented by this object.
   *
   * @return {string} The fully constructed query
   */
  CuriousQuery.prototype.query = function query() {
    var queryString = '';
    var terms = [];

    // Flatten all terms and arrays of terms into a single array
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
        if (term.conditional()) {
          queryString += ' ';
        } else if (
          !term.conditional()
          && !terms[termIndex - 1].leftJoin()
          && !term.leftJoin()
        ) {
          queryString += ', ';
        } else {
          queryString += ' ';
        }
      }

      queryString += term;
    });

    return queryString;
  };

  /**
   * Convert this object to a string, returning the complete query string
   *
   * @return {string} The fully constructed query
   */
  CuriousQuery.prototype.toString = function toString() { return this.query(); };

  /**
   * Convert this probject to its native value equivalent, returning the complete query string
   *
   * @return {string} The fully constructed query
   */
  CuriousQuery.prototype.valueOf = function valueOf() { return this.query(); };

  /**
   * Convert this probject to a plain JavaScript object to allow it to be serialized.
   *
   * @return {string} The fully constructed query
   */
  CuriousQuery.prototype.toJSON = function toJSON() {
    return {
      terms: this.terms,
      relationships: this.relationships,
      params: this.params,

      // Object Factories can't be serialized directly: they're functions.
      objectFactories: this.objectFactories.map(function (factory) {
        return factory ? factory.toString() : null;
      }),

      // Existing objects are turned into plain objects if possible, or left alone otherwise.
      existingObjects: this.existingObjects.map(function (objectArray) {
        return objectArray.map(function (existingObject) {
          return (
            existingObject.toJSON
              ? existingObject.toJSON()
              : existingObject
          );
        });
      }),
    };
  };

  /**
   * Extend this query object with another query object: return a new query
   * chain with the current query chain's terms followed
   * by the other query chain's terms.
   *
   * @param {CuriousQuery} extensionQueryObject The query object being added
   * @return {CuriousQuery} The combined query
   */
  CuriousQuery.prototype.extend = function extend(extensionQueryObject) {
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
  CuriousQuery.prototype.clone = function clone() {
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
   * @param {!QueryTerm|Array<QuerryTerm>} termObject
   *   A {@link module:curious~QueryTerm} object to append to the term, or an
   *   array of them
   * @param {!string} relationship
   *   The name of this term in inter-term relationships
   * @param {?function(Object)=} customConstructor
   *   A custom constructor for the resulting objects, if this part of the
   *   query returns new objects
   *
   * @return {CuriousQuery} The query object, with the new term added
   */
  CuriousQuery.prototype._addTerm = function _addTerm(
    termObject, relationship, customConstructor
  ) {
    // Ensure that objectFactories, relationships, and terms always have the
    // same number of elements.

    if (termObject && relationship) {
      this.terms.push(termObject);
      this.relationships.push(relationship);
    } else {
      throw new Error(
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
   * @param {!QueryTerm|Array<!QueryTerm>} termObject
   *   A {@link module:curious~QueryTerm} object (or an array of them), to
   *   append to the previous term
   *
   * @return {CuriousQuery}
   *   The query object, with the term object's string representation appended
   *   to the previous term
   */
  CuriousQuery.prototype._appendToPreviousTerm = function _appendToPreviousTerm(termObject) {
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
      throw new Error('Must add terms before appending "' + termObject + '" to them.');
    }

    return this;
  };

  /**
   * Add a starting term to this query. Equivalent to passing parameters
   * directly to the constructor.
   *
   * @param {!string} termString
   *   The contents of the starting term
   * @param {!string} relationship
   *   The name of this term in inter-term relationships
   * @param {?function(Object)=} customConstructor
   *   A custom constructor for the resulting objects, if this part of the
   *   query returns new objects
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.start = function start(termString, relationship, customConstructor) {
    return this._addTerm(new QueryTermFollow(termString), relationship, customConstructor);
  };

  /**
   * Add an inner-join term to this query.
   *
   * @param {!string} termString
   *   The contents of the starting term
   * @param {!string} relationship
   *   The name of this term in inter-term relationships
   * @param {?function(Object)=} customConstructor
   *   A custom constructor function for the resulting objects
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.follow = function follow(termString, relationship, customConstructor) {
    return this._addTerm(new QueryTermFollow(termString), relationship, customConstructor);
  };

  /**
   * Add a filter term to this query.
   *
   * @param {!string} termString
   *   The subquery to filter by
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.having = function having(termString) {
    return this._appendToPreviousTerm(new QueryTermHaving(termString));
  };

  /**
   * Add an exclude filter term to this query.
   *
   * @param {!string} termString
   *   The subquery to filter by
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.notHaving = function notHaving(termString) {
    return this._appendToPreviousTerm(new QueryTermNotHaving(termString));
  };

  /**
   * Add an outer-join term to this query.
   *
   * @method with
   *
   * @param {!string} termString
   *   The contents of the starting term
   * @param {!string} relationship
   *   The name of this term in inter-term relationships
   * @param {?function(Object)=} customConstructor
   *   A custom constructor for the resulting objects, if this part of the
   *   query returns new objects
   *
   * @return {CuriousQuery} The query object, with the term appended
   */
  CuriousQuery.prototype.with = function _with(termString, relationship, customConstructor) {
    return this._addTerm(new QueryTermWith(termString), relationship, customConstructor);
  };

  /**
   * Specify the object constructor to use for the preceding term in the query.
   *
   * @param {?function(Object)=} customConstructor
   *   A constructor to use when instantiating objects from the previous part of
   *   the query
   *
   * @return {CuriousQuery}
   *   The query object, with the new constructor data stored internally
   */
  CuriousQuery.prototype.wrapWith = function wrapWith(customConstructor) {
    return this.wrapDynamically(_makeObjectFactory(customConstructor));
  };

  /**
   * Specify the object factory function to use for the preceding term in the
   * query. Unlike wrapDynamically, which can work with traditional
   * constructors that do not return a value by default, this will only work
   * with factory functions that explicitly return an object.
   *
   * @param {function(Object)} factoryFunction
   *   A factory function that returns an object of the desired wrapping class
   *
   * @return {CuriousQuery}
   *   The query object, with the new constructor data stored internally
   */
  CuriousQuery.prototype.wrapDynamically = function wrapDynamically(factoryFunction) {
    if (this.objectFactories.length) {
      this.objectFactories[this.objectFactories.length - 1] = factoryFunction;
    } else {
      throw new Error('Cannot specify custom object constructor before starting a query');
    }

    return this;
  };

  /**
   * Set the parameters that this query will pass to its curious client when
   * perform is called.
   *
   * @param {!Object} params
   *   An object of parameters to set--see
   *   {@link module:curious.CuriousClient#performQuery} for a full description of the
   *   parameters.
   *
   * @return {CuriousQuery}
   *   The query object with its curious client parameters updated
   */
  CuriousQuery.prototype.setParams = function setParams(params) {
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
   * @param {!Array<!Object>} objs The existing objects to set
   *
   * @return {CuriousQuery} The query object with its existing object set
   *                        updated
   */
  CuriousQuery.prototype.setExistingObjects = function setExistingObjects(objs) {
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
   * Perform the query using a passed-in CuriousClient object.
   *
   * @param {!CuriousClient} curiousClient
   *   A CuriousClient object that will handle performing the actual query
   *
   * @return {Promise}
   *   A promise, as returned by {@link module:curious.CuriousClient#performQuery}
   *
   */
  CuriousQuery.prototype.perform = function perform(curiousClient) {
    var promise;
    var q = this.query();

    promise = curiousClient.performQuery(
      q, this.relationships, this.objectFactories, this.params, this.existingObjects
    );

    // Attach any thenable resolve/reject promise callback pairs to the promise that
    // results from query execution
    this.thens.forEach(function (thenPair) {
      // thenPair looks like [resolved, rejected]
      if (thenPair[0]) {
        // Just like promise = promise.then(resolved, rejected);
        promise = promise.then.apply(promise, thenPair);
      } else if (thenPair.length > 1 && thenPair[1]) {
        // If the first callback is null but the second one isn't, we're looking at a catch
        // situation. We use the same data structure to store both situations, so that they're
        // attached to the promise in the same order they were attached to the Query object
        promise = promise.catch(thenPair[1]);
      }
    });

    return promise;
  };

  /**
   * Add a (pair of) callback(s) to be called when the promise to perform the query resolves.
   *
   * This can be useful for constructing a query object with known post-processing before
   * actually executing it.
   *
   * @param {function} fulfilled
   *   A function to call when the promise is fulfilled (just like you would pass to
   *   Promise.prototype.then)
   *
   * @param {function=} rejected
   *   A function to call when the promise is rejected (just like you would pass as the
   *   second argument to Promise.prototype.then)
   *
   * @return {CuriousQuery}
   *   The query itself, to allow chaining <code>then</code>s, or any other methods
   */
  CuriousQuery.prototype.then = function then(fulfilled, rejected) {
    this.thens.push([fulfilled, rejected]);

    return this;
  };

  /**
   * Add a callback to be called if the promise to perform the query is rejected.
   *
   * This can be useful for constructing a query object with known error-handling before
   * actually executing it.
   *
   * @method catch
   *
   * @param {function} rejected
   *   A function to call when the promise is rejected (just like you would pass to
   *   Promise.prototype.catch)
   *
   * @return {CuriousQuery}
   *   The query itself, to allow chaining <code>then</code>s <code>catch</code>es, or any other methods
   */
  CuriousQuery.prototype.catch = function _catch(rejected) {
    this.thens.push([null, rejected]);

    return this;
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
   *   the object
   *
   * @return {function} A factory function that will return a new object
   *                    whenever called
   */
  function _makeObjectFactory(customConstructor) {
    var CustomConstructorClass = customConstructor;
    return function CustomConstructorClassFactory() {
      return new CustomConstructorClass();
    };
  }


  // CURIOUS OBJECTS

  /**
   * Utilities for dealing with curious objects
   * @namespace
   * @alias module:curious.CuriousObjects
   */
  var CuriousObjects = (function _curiousObjectsModule() {
    /**
     * Base (default) class for an object returned from a Curious query
     *
     * @class
     * @static
     * @alias module:curious.CuriousObjects.defaultType
     *
     * @param {Object} objectData
     *   A plain JavaScript object representing the query data, as parsed from
     *   the returned JSON
     * @param {boolean=} camelCase
     *   If true, construct camel-cased versions the fields in objectData
     */
    function CuriousObject(objectData, camelCase) {
      var newObject = this;

      // Special properties that aren't data-bearing, but are often convenient
      newObject.__url = null;
      newObject.__model = null;

      // Copy over the object data to be properties of the new CuriousObject
      if (objectData instanceof Object && !(objectData instanceof Array)) {
        Object.keys(objectData).forEach(function (key) {
          var newKey = key;

          if (camelCase) {
            newKey = CuriousObjects.makeCamelCase(key);
          }

          newObject[newKey] = objectData[key];
        });
      }

      return newObject;
    }

    /**
     * Serialize CuriousObject instances to JSON effectively if they are passed to JSON.stringify
     *
     * @return {Object} A plain JavaScript object containing the CuriousObject's data
     */
    CuriousObject.prototype.toJSON = function toJSON() {
      var curiousObject = this;
      var serializableObject = {};

      // Copy over the object data to be properties of the new CuriousObject
      Object.keys(curiousObject).forEach(function (key) {
        serializableObject[key] = curiousObject[key];
      });

      return serializableObject;
    };

    /**
     * When parsing a JSON string into objects, instantiate any objects that look like
     * CuriousObject instances as such, instead of plain JavaScript objects.
     *
     * @static
     * @param {string} jsonString A string of JSON-encoded data
     *
     * @return {*} The instantiated JSON-encoded data, with CuriousObjects placed where
     *             appropriate
     */
    CuriousObject.fromJSON = function fromJSON(jsonString) {
      return JSON.parse(jsonString, function (key, value) {
        var parsedValue = value;

        // If a plain object has '__url' and '__model' fields, it's probably a CuriousObject
        if (value && value.hasOwnProperty('__url') && value.hasOwnProperty('__model')) {
          parsedValue = new CuriousObject(value);
        }

        return parsedValue;
      });
    };

    /**
     * When a Curious query is performed, the returned data comes in a set of 3
     * arrays to save space: objects, fields, urls. Assemble that data into a
     * single array of objects, each of which has the appropriate fields. This
     * makes the data much more reasonable to work with.
     *
     * @private
     * @memberof module:curious.CuriousObjects
     *
     * @param {Object<string, Array>} queryData
     *   A plain JavaScript object representing the query data, as parsed from
     *   the returned JSON--this format is not meant to be easy to use, but
     *   takes less space.
     * @param {Array<string>} queryData.fields
     *   The fields every object has
     * @param {Array<Array>} queryData.objects
     *   An array of arrays, where each array is the values of a single object's
     *   properties, in the order specified by <code>queryData.fields</code>
     * @param {Array<string>} queryData.urls
     *   The url of every object, if they have one
     * @param {string} model
     *   The name of the Django model these objects come from
     * @param {?function(Object)} customConstructor
     *   A constructor to use instead of the default CuriousObject constructor
     * @param {boolean=} camelCase
     *   If true, construct camel-cased versions of the JSON objects returned
     *   by the Curious server.
     *
     * @return {Array<CuriousObject|CustomConstructorClass>}
     *   An array of objects that contain the data described in queryData
     */
    function _parseObjects(queryData, model, customConstructor, camelCase) {
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
              var newFieldName = fieldName;

              if (camelCase) {
                newFieldName = CuriousObjects.makeCamelCase(fieldName);
              }

              // NOTE: don't check for obj.hasOwnProperty - we actually want to
              // override existing fields in obj
              obj[newFieldName] = objectData[fieldName];
            });
          } else {
            // The CuriousObject constructor does this automatically
            obj = new CuriousObject(objectData, camelCase);
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
     * @param {Array<string>} relationships
     *   The names of the relationships objects will have to one another
     * @param {Array<function(Object)>} customConstructors
     *   The custom constructors for curious object classes
     * @param {Object} queryJSONResponse
     *   An object of fields holding the query response, as returned and parsed
     *   directly from JSON without any post-processing
     * @param {string} queryJSONResponse.computed_on
     *   The query timestamp
     * @param {string} queryJSONResponse.last_model
     *   The model name of the last set of objects returned
     * @param {Array<Object>} queryJSONResponse.results
     *   An array of objects containing Django object ids and other
     *   meta-information about the query; one element per model
     * @param {string} queryJSONResponse.results[].model
     *   The model name for this part of the query
     * @param {number} queryJSONResponse.results[].join_index
     *   The index of the model this model joins to
     * @param {Array<Array>} queryJSONResponse.results[].objects
     *   The IDs of the objects returned by the query
     * @param {Array<Object>} queryJSONResponse.data
     *   An array of objects containing the other fields of the Django objects, more than just the
     *   IDs--see {@link module:curious.CuriousObjects~_parseObjects} for a description of this data
     *   in the queryData parameter.
     * @param {Array<Object<number, Object>>} existingObjects
     *   The existing objects--each object in the array is a mapping of an id
     *   to its corresponding object.
     * @param {boolean=} camelCase
     *   If true, construct camel-cased versions of the JSON objects returned
     *   by the Curious server.
     *
     * @return {{objects: Array<Object>, trees: Array<Object>}}
     *   The parsed objects--<code>trees</code> holds any hierarchical
     *   relationships, for recursive queries.
     */
    function parse(
      relationships, customConstructors, queryJSONResponse, existingObjects,
      camelCase
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
              : null,

            camelCase
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

          if (camelCase) {
            forwardRelationshipName = CuriousObjects.makeCamelCase(forwardRelationshipName);
            reverseRelationshipName = CuriousObjects.makeCamelCase(reverseRelationshipName);
          }

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
              var obj;
              var srcObj; // the corresponding objects


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
     * the same order as its keys would come out
     *
     * @memberof module:curious.CuriousObjects
     *
     * @param {Object} obj The object to look at
     *
     * @return {Array} The values of the object, whatever it holds
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
     * @param {Array<Object>} arrayOfObjects The array to turn into an object
     *
     * @return {Array} The values of the object, whatever it holds
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
     * @param {Array<Object>} objects
     *   An array of objects with the <code>id</code> property
     *
     * @return {Array<number>}
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
     * @param {Array<Object>} arrayOfObjects The array to turn into an object
     *
     * @return {string} A comma-separated string containing the objects' IDs,
     *                  with duplicates removed, in the same order as the input
     *                  object list
     */
    function idString(arrayOfObjects) {
      var ids = idList(arrayOfObjects);
      return ids.join(',');
    }

    /**
     * Camel case a string with - or _ separators:
     *
     * @example
     * CuriousObjects.makeCamelCase('this_is-someTHING') === 'thisIsSomething'
     * CuriousObjects.makeCamelCase('_alreadyDone') === '_alreadyDone'
     *
     * @memberof module:curious.CuriousObjects
     *
     * @param {string} input The string to camel-case
     *
     * @return {string} The input, camel-cased
     */
    function makeCamelCase(input) {
      var components;
      var casedComponents;
      var separators;
      var output = input;

      if (input) {
        // For leading/trailing separators
        separators = {
          leading: {
            re: /^[-_]+/g,
            match: null,
            text: '',
          },
          trailing: {
            re: /[-_]+$/g,
            match: null,
            text: '',
          },
        };

        // Match the leading/trailing separators and store the text
        Object.keys(separators).forEach(function (key) {
          var separatorType = separators[key];
          separatorType.match = separatorType.re.exec(input);
          if (separatorType.match) {
            separatorType.text = separatorType.match[0];
          }
        });

        if (separators.leading.text.length === input.length) {
          // Special case: string consists entirely of separators: just return it
          output = input;
        } else {
          // Only split the parts of the string that are not leading/trailing
          // separators
          components = input.substring(
            separators.leading.text.length,
            input.length - separators.trailing.text.length
          ).split(/[_-]/);

          // If we don't have anything to camel-case, just leave the body alone
          if (components.length > 1) {
            casedComponents = components.map(function (component, ix) {
              // Normalize by lowercasing everything
              var casedComponent = component.toLowerCase();

              // Capitalize every word but the first
              if (ix > 0) {
                casedComponent = (
                  casedComponent.charAt(0).toUpperCase()
                  + casedComponent.slice(1)
                );
              }

              return casedComponent;
            });
          } else {
            casedComponents = components;
          }

          output = (
            separators.leading.text
            + casedComponents.join('')
            + separators.trailing.text
          );
        }
      }

      return output;
    }

    return {
      parse: parse,
      values: values,
      groupObjectsByID: groupObjectsByID,
      idList: idList,
      idString: idString,
      makeCamelCase: makeCamelCase,
      defaultType: CuriousObject,
    };
  }());

  // QUERY CLIENT

  /**
   * Rearrange the results from an array of arrays of objects to an object,
   * where each array of objects is named by its appropriate relationship name.
   *
   * @param {Array<string>} relationships The relationship names
   * @param {Array<Array<Object>>} objects The objects from each relationship
   * @param {boolean=} camelCase Whether or not to camel-case the relationship names
   *
   * @return {Object<string, Array>} The rearranged results
   */
  function _convertResultsToOutput(relationships, objects, camelCase) {
    var output = {};

    objects.forEach(function (object, objectIndex) {
      var relationship = relationships[objectIndex];
      var uniqueIndex = 2;

      if (camelCase) {
        relationship = CuriousObjects.makeCamelCase(relationship);
      }

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
   * @param {?Object=} queryArgs Query-specific args
   * @param {?Object=} clientDefaultArgs Client-specific args
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
      var group = null;

      if (arrayOfObjects) {
        group = CuriousObjects.groupObjectsByID(arrayOfObjects);
      }

      return group;
    });
  }

  /**
   * Determine the query endpoint URL from the base URL: add in the query endpoint '/q/' if the URL
   * does not already include it, and make sure the URL ends in a '/'.
   *
   * @param {string} url The base URL, maybe also including the query endpoint
   *
   * @return {string} The fully formed query URL, ending in a '/'.
   */
  function _getQueryUrl(url) {
    var queryUrl = url;

    // Ensure that we end with a '/'
    if (!queryUrl.endsWith('/')) {
      queryUrl += '/';
    }

    // Ensure that if the last component was not '/q/', it is now;
    if (!queryUrl.endsWith('/q/')) {
      queryUrl += 'q/';
    }

    return queryUrl;
  }


  /**
   * Tool for making a curious query and returning parsed objects
   *
   * @class
   * @alias module:curious.CuriousClient
   *
   * @param {!string} curiousUrl
   *   <p>The URL of the Curious server. The query is sent to <code>curiousUrl + '/q/'</code>.</p>
   *
   *   <p>XXX: For compatability with legacy clients, the <code>/q/</code> is not added if
   *   <code>curiousUrl</code> has a 'q' as its last path element. However, <em>new code should not
   *   rely on this behavior</em>.</p>
   * @param {function (string, Object): Promise} request
   *   <p>A function that makes a <code>POST</code> request and returns a Promise
   *   (a thenable)--examples are <code>jQuery.post</code>,
   *   <code>axios.post</code>, and Angular's <code>$http.post</code>.</p>
   *
   *   <p>Any function that meets the signature, makes a <code>POST</code> request and
   *   returns a thenable that resolves to the parsed JSON of the curious
   *   server's response will work. Note that axios.post and $http.post wrap the
   *   response in an object, and so require wrapper functions to be used.
   *   See {@link module:curious.CuriousClient.wrappers} for the wrappers.</p>
   * @param {Object=} clientDefaultArgs
   *   Default parameters to send to the serever with every query performed by
   *   this client--see {@link module:curious.CuriousClient#performQuery} for an
   *   explanation of what each parameter means.
   * @param {boolean=} quiet
   *   Unless true, log every query to the console.
   * @param {boolean=} camelCase
   *   If true, construct camel-cased versions of the JSON objects returned
   *   by the Curious server.
   *
   * @return {CuriousClient}
   *   A client object with a single performQuery method
   */
  function CuriousClient(curiousUrl, request, clientDefaultArgs, quiet, camelCase) {
    return {
      /** The URL to query */
      queryUrl: _getQueryUrl(curiousUrl),

      /**
       * Perform a Curious query and return back parsed objects.
       *
       * @example
       * // Here's a many-to-many example
       * client.performQuery(
       *   'Document(id__in=[1,2]) ?(Document.entities)',
       *   ['documents', 'entities'],
       * ).then(function (results) {
       *
       *   console.log(results.objects.documents);
       *   // Will show an array of documents, as CuriousObject instances:
       *   // [
       *   //   CuriousObject({
       *   //      __model: 'Document',
       *   //      __url: 'http://somewhere/document/1',
       *   //      id: 1,
       *   //      entities: [
       *   //        // entities associated with document 1
       *   //      ]
       *   //      ... other fields of Document objects ...
       *   //   }),
       *   //  CuriousObject({
       *   //      __model: 'Document',
       *   //      __url: 'http://somewhere/document/2',
       *   //      id: 2,
       *   //      entities: [
       *   //        // entities associated with document 2
       *   //      ]
       *   //      ...
       *   //   }),
       *   // ]
       *
       *   console.log(results.objects.entities);
       *   // Will show an array of entities, as CuriousObject instances:
       *   // [
       *   //   CuriousObject({
       *   //      __model: 'Entity',
       *   //      __url: 'http://somewhere/entity/1',
       *   //      id: 2348,
       *   //      documents: [
       *   //        // documents associated with entity 1
       *   //      ]
       *   //      ... other fields of Entity objects ...
       *   //   }),
       *   //  CuriousObject({
       *   //      __model: 'Entity',
       *   //      __url: 'http://somewhere/entity/2',
       *   //      id: 2725,
       *   //      documents: [
       *   //        // documents associated with entity 2
       *   //      ]
       *   //      ...
       *   //   }),
       *   // ]
       * });
       *
       * @memberof module:curious.CuriousClient
       *
       * @param {!string} q
       *   The query string
       * @param {!Array<string>} relationships
       *   The names of relationships between each joined set of objects
       * @param {?Array<?function(Object)>} constructors
       *   An array of constructors for any custom classes, or null for the
       *   default
       * @param {?Object=} params
       *   Query-specific parameters for the request
       * @param {boolean=} params.x
       *   Whether or not to ignore excludes; defaults to false
       * @param {boolean=} params.c
       *   Whether or not to just do a check of the query syntax; defaults to
       *   false
       * @param {boolean=} params.d
       *   Whether or not return the object data, or just return ids; always
       *   forced to be true for the JavaScript client
       * @param {boolean=} params.fk
       *   Whether or not follow foreign keys: if false, foregin keys will be
       *   IDs, as expecte. If true, foreign keys will be 4-member arrays
       *   that include the ID, name, and URL of the object being pointed to.
       *   Defaults to false.
       * @param {boolean=} params.r
       *   If true, force a refresh of the data not from cache; defaults to
       *   false.
       * @param {boolean=} params.fc
       *   If true, force using the cached data; defaults to false.
       * @param {string=} params.app
       *   If provided, the name of the app, to use for cache key construction.
       * @param {Array<Array<Object>>=} existingObjects
       *   Objects that already exist to be linked into the results returned by
       *   this query
       *
       * @return {Promise<{objects: Array, trees: Array<?Object>}>}
       *   A promise that resolves to an object containing the objects requested by the query
       *   and a tree structure that relates IDs for recursive queries
       *
       */
      performQuery: function performQuery(q, relationships, constructors, params, existingObjects) {
        var args;
        var groupedExistingObjects;

        if (!quiet) {
          /* eslint-disable no-console */
          console.info(q);
          /* eslint-enable no-console */
        }

        if (existingObjects) {
          groupedExistingObjects = _groupArraysOfObjectsByID(existingObjects);
        }

        args = _getArgs(params, clientDefaultArgs);
        args.q = q.replace('\n', ' ');

        return request(this.queryUrl, args)
          .then(function (response) {
            var parsedResult = CuriousObjects.parse(
              relationships,
              constructors,
              response.result,
              groupedExistingObjects,
              camelCase
            );

            return {
              objects: _convertResultsToOutput(relationships, parsedResult.objects, camelCase),
              trees: parsedResult.trees,
            };
          });
      },
    };
  }

  /**
   * Common code of convenience functions that make it easier to interact
   * with a variety of http clients: used to set a default module name if one
   * is not provided for the wrapper.
   *
   * @example
   * var axiosWrapper = _unwrapResponseData.bind(this, 'axios');
   *
   * @private
   * @memberof module:curious.CuriousClient.wrappers
   *
   * @param {string} defaultModuleName
   *   The default module object name to use if one is not provided--should
   *   be bound to a string when actually used as a wrapper.
   * @param {?Object=} moduleObjectOrFunction
   *   Either the module to use, like <code>axios</code>/<code>$http</code>, or the posting function
   *   itself, like <code>axios.post</code>.
   * @param {?Object=} options
   *   Additional options to send to the requesting function
   *
   * @return {function(string, Object): Promise}
   *  A function that meets the requirements to make requests in the curious client:
   *  takes the url and arguments, makes a <code>POST</code> request, and returns
   *  a promise that resolves directly to the returned query response (unwrapped)
   */
  function _unwrapResponseData(defaultModuleName, moduleObjectOrFunction, options) {
    var mod;
    var postRequestFunction;

    // Prevent code injection
    if (/[^$.\w'"\[\]]/.test(defaultModuleName)) {
      throw new Error('Invalid module name: likely code injection attempt');
    }

    // Default to the provided module name, but if one is not provided,
    // look in the global namespace, then in the this context, and finally,
    // just evaluate the variable with that name and see if it resovles
    // to something.
    // XXX uses `eval`, only as a last resort. there is no way around this.
    /* eslint-disable no-eval */
    mod = moduleObjectOrFunction
      || (typeof module !== 'undefined' && module[defaultModuleName])
      || (typeof exports !== 'undefined' && exports[defaultModuleName])
      || (typeof global !== 'undefined' && global[defaultModuleName])
      || (typeof window !== 'undefined' && window[defaultModuleName])
      || eval(defaultModuleName);
    /* eslint-enable no-eval */

    // If the module provided has a `post` method, use that. Otherwise,
    // just call the "module" itself: this allows passing in either
    // $http or $http.post, for example
    postRequestFunction = mod.post ? mod.post.bind(mod) : mod;

    // axios/angular return the server's response nested within an object
    // (response.data); here we return a tiny filter function to pull that
    // server response out
    return function _postRequestWrapper(url, args) {
      return postRequestFunction(url, args, options || {})
        .then(function (response) {
          return response.data;
        });
    };
  }

  /**
   * Convenience functions for interfacing with a variety of common HTTP/ajax
   * client libraries.
   *
   * NOTE: None of these client libraries are required by this module—the wrappers are here simply
   * to help CuriousCient interact with code that uses those libraries.
   *
   * NOTE: <code>jQuery.post</code> does not need a wrapper--it, and any other functions that
   * work like it and resolve to the same kind of data structure can be passed directly as the
   * <code>request</code> parameter.
   *
   * @namespace module:curious.CuriousClient.wrappers
   */
  CuriousClient.wrappers = {};

  /**
   * Convenience function to make it easier to interact with axios responses
   * (axios is not required by this module at all.)
   *
   * @example
   * var client = new CuriousClient(CURIOUS_URL, CuriousClient.wrappers.axios() ...)
   * var client = new CuriousClient(CURIOUS_URL, CuriousClient.wrappers.axios(axios) ...)
   *
   * @function
   * @memberof module:curious.CuriousClient.wrappers
   *
   * @param {?Object} axiosModuleOrFunction
   *   Either the <code>axios</code> module itself, or <code>axios.post</code>--defaults to using
   *   whatever <code>axios</code> resolves to
   * @param {?Object} options
   *   Additional options to send to the requesting function
   *
   * @return {function(string, Object): Promise}
   *  A function that meets the requirements to make requests in the curious client:
   *  takes the url and arguments, makes an axios post request, and returns
   *  a promise that resolves directly to the returned query response (unwrapped).
   */
  CuriousClient.wrappers.axios = _unwrapResponseData.bind(this, 'axios');

  /**
   * Convenience function to make it easier to interact with AngularJS <code>$http.post</code>
   * responses (AngularJS is not required by this module at all.)
   *
   * @example
   * var client = new CuriousClient(CURIOUS_URL, CuriousClient.wrappers.angular() ...)
   * var client = new CuriousClient(CURIOUS_URL, CuriousClient.wrappers.angular($http) ...)
   *
   * @function
   * @memberof module:curious.CuriousClient.wrappers
   *
   * @param {?Object} angularHttpServiceOrPostFunction
   *   Either the Angular <code>$http</code> service object, or <code>$http.post</code>--defaults
   *   to using whatever <code>$http</code> resolves to.
   * @param {?Object} options
   *   Additional options to send to the requesting function
   *
   * @return {function(string, Object): Promise}
   *  A function that meets the requirements to make requests in the curious client:
   *  takes the url and arguments, makes a <code>POST</code> request and returns
   *  a promise that resolves directly to the returned query response (unwrapped)
   */
  CuriousClient.wrappers.angular = _unwrapResponseData.bind(this, '$http');

  /**
   * Convenience function to make it easier to interact with Polymer's
   * <code>&lt;iron-ajax&gt;</code> element.
   *
   * @example
   * var client = new CuriousClient(CURIOUS_URL, CuriousClient.wrappers.ironAjax(this.$.xhr) ...)
   *
   * @memberof module:curious.CuriousClient.wrappers
   *
   * @param {!PolymerElement} ironAjaxElement
   *   The <code>iron-ajax</code> element being used to make the request
   * @param {?Object} options
   *   Additional options to send to the requesting function
   *
   * @return {function(string, Object=): Promise}
   *  A function that meets the requirements to make requests in the curious client:
   *  takes the url and arguments, makes a <code>POST</code> request with
   *  <code>ironAjaxElement</code>, and returns a promise that resolves
   *  directly to the returned query response (unwrapped)
   */
  CuriousClient.wrappers.ironAjax = function ironAjax(ironAjaxElement, options) {
    return function (url, args) {
      var oldAutoValue;
      var request;

      // Don't make requests while we're setting the properties.
      oldAutoValue = ironAjaxElement.get('auto');
      ironAjaxElement.set('auto', false);

      if (options) {
        Object.keys(options).forEach(function (option) {
          ironAjaxElement.set(option, options[option]);
        });
      }

      ironAjaxElement.set('method', 'POST');
      ironAjaxElement.set('url', url);
      ironAjaxElement.set('contentType', 'application/json');
      ironAjaxElement.set('body', args);

      request = ironAjaxElement.generateRequest();

      // Return auto to its old state
      ironAjaxElement.set('auto', oldAutoValue);

      // Return the promise that gets fired when the XHR completes, but parse
      // out the actual response data, since the original promise resolves to
      // the iron-request object.
      return request.completes.then(function (ironRequestObject) {
        return ironRequestObject.response;
      });
    };
  };

  exports.CuriousObjects = CuriousObjects;
  exports.CuriousClient = CuriousClient;
  exports.CuriousQuery = CuriousQuery;

  return exports;
});
// vim: sw=2 ts=2 sts=2 et
