# curious-js

JavaScript consumer code for Curious APIs.

## Usage

### Installation

`curious-js` is available both from [bower](https://bower.io/search/?q=curious-js) and from [npm](https://www.npmjs.com/package/curious-js).

### Importing

`curious-js` has been written using the [UMD](https://github.com/umdjs/umd) module pattern. This
pattern should be compatible with AMD/require.js, CommonJS/node.js, direct loading in the browser,
and Babel module variants. Requiring or loading the `curious.js` file will create a module (with the
default name `curious`) in whatever system you are using.

### Using

There are two main parts to using Curious from Javascript: `CuriousClient`,
and `CuriousQuery`.

First, create an instance of `CuriousClient` that points to your Curious server. You are responsible
for picking and using a request method that works for you. `CuriousClient` provides some convenience
wrappers, but you can make any asynchronous transport layer work by passing a custom function as the
second parameter to the client constructor. Note that if you're using jQuery, `jQuery.post` does not
require any wrapping and can be passed as the second parameter directly.

```javascript
// example using Axios
var curiousClient = new curious.CuriousClient(CURIOUS_URL, curious.CuriousClient.wrappers.axios(axios), ...);

// example using a custom request method
var curiousClient = new curious.CuriousClient(CURIOUS_URL, function (url, data) {
  return new Promise(function (resolve, reject) {
    var result;
    var error;

    // perform some asynchronous access

    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  });
}, ...);
```

Then, construct a `CuriousQuery` and perform it on the server using the client. Attach any callbacks
to the Promise object returned by the `perform` method, or directly to the query object. They will
be executed in the order they were attached, before any callbacks attached later. The results of the
query will be passed to the callback.

Here's a trivial example. The results, of course, depend on the schema on the Curious server; the
example uses a made up schema consiting of Document and Section entities in a 1:many relationship.

```javascript
// A simple node.js use case; works similarly on the front end, minus module loading

const util = require('util');
const axios = require('axios');
const curious = require('curious');

// Define a client to connect to a curious server
const client = new curious.CuriousClient(
 'http://your-curious.com',
  curious.CuriousClient.wrappers.axios(axios),
  null, // serverArgs
  true, // quiet
  true  // camelCase
);

// The schema here is a simple 1:many relationship

// Make a query
const q = new curious.CuriousQuery('Document(id=12345)', 'documents')
  .follow('Document.section_set', 'sections');

// Perform that query with the client
q.perform(client).then((data) => {

  // In the callback, examine the resulting data
  try {
    console.log('data:');
    console.log(data);

    console.log('data.objects:');
    console.log(data.objects);

    console.log('data.objects.documents:');
    console.log(data.objects.documents);

    console.log('data.objects.documents[0].sections:');
    console.log(data.objects.documents[0].sections);

    console.log('data.objects.documents[0].sections[0].documents[0]:');
    console.log(data.objects.documents[0].sections[0].documents[0]);

    console.log('data.objects.sections:');
    console.log(data.objects.sections);

    console.log('data.objects.sections[0].documents:');
    console.log(data.objects.sections[0].documents);

    console.log('data.objects.sections[0].documents[0].sections[0]:');
    console.log(data.objects.sections[0].documents[0].sections[0]);
  } catch (e) {
    console.error(e);
  }

  return data;
}, console.error);
```

The output from the example code above would look something like this, depending on the data:
```javascript
data:
{ objects: { documents: [ [Object] ], sections: [ [Object], [Object] ] },
  trees: [ null, null ] }

data.objects:
{ documents:
   [ CuriousObject {
       __url: 'http://your-curious.com/document/12345',
       __model: 'Document',
       id: 12345,
       ...
       sections: [Object] } ],
  sections:
   [ CuriousObject {
       __url: null,
       __model: 'Section',
       id: 12205,
       documentId: 12345,
       ...
       documents: [Object] },
     CuriousObject {
       __url: null,
       __model: 'Section',
       id: 112403,
       documentId: 12345,
       ...
       documents: [Object] } ] }

data.objects.documents:
[ CuriousObject {
    __url: 'http://your-curious.com/document/12345',
    __model: 'Document',
    id: 12345,
    ...
    sections: [ [Object], [Object] ] } ]

data.objects.documents[0].sections:
[ CuriousObject {
    __url: null,
    __model: 'Section',
    id: 12205,
    documentId: 12345,
    ...
    documents: [ [Object] ] },
  CuriousObject {
    __url: null,
    __model: 'Section',
    id: 112403,
    documentId: 12345,
    ...
    documents: [ [Object] ] } ]

data.objects.documents[0].sections[0].documents[0]:
CuriousObject {
  __url: 'http://your-curious.com/document/12345',
  __model: 'Document',
  id: 12345,
  ...
  sections:
   [ CuriousObject {
       __url: null,
       __model: 'Section',
       id: 12205,
       documentId: 12345,
       ...
       documents: [Object] },
     CuriousObject {
       __url: null,
       __model: 'Section',
       id: 112403,
       documentId: 12345,
       ...
       documents: [Object] } ] }

data.objects.sections:
[ CuriousObject {
    __url: null,
    __model: 'Section',
    id: 12205,
    documentId: 12345,
    ...
    documents: [ [Object] ] },
  CuriousObject {
    __url: null,
    __model: 'Section',
    id: 112403,
    documentId: 12345,
    ...
    documents: [ [Object] ] } ]

data.objects.sections[0].documents:
[ CuriousObject {
    __url: 'http://your-curious.com/document/12345',
    __model: 'Document',
    id: 12345,
    ...
    sections: [ [Object], [Object] ] } ]

data.objects.sections[0].documents[0].sections[0]:
CuriousObject {
  __url: null,
  __model: 'Section',
  id: 12205,
  documentId: 12345,
  ...
  documents:
   [ CuriousObject {
       __url: 'http://your-curious.com/document/12345',
       __model: 'Document',
       id: 12345,
       ...
       sections: [Object] } ] }
```

The API is explained in detail in  the documentation.

## Development

This project provides a basic Dockerfile that builds a Docker container capable of running unit
tests. To run the tests, bring up the container with `docker-compose up`.

### Test framework

The tests are written in [mocha](https://mochajs.org/), with [chai](http://chaijs.com/) expect-style
assertions.
