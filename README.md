# curious-js

JavaScript consumer code for Curious APIs.

## Usage

There are two main parts to using the Curious from Javascript: `CuriousClient`,
and `CuriousQuery`.

First, create an instance of `CuriousClient` that points to your curious
server. You are responsible for picking and using a request method that works
for you. `CuriousClient` provides some convenience wrappers, but you can make
any asynchronous transport layer work.

```javascript
var curiousClient = new curious.CuriousClient(CURIOUS_URL, curious.CuriousClient.wrappers.axios(axios), ...);
```

Then, construct a `CuriousQuery` and perform it on the server using the client.
Attach any callbacks to the Promise object returned by the `perform` method. The
results of the query will be passed to the callback.

Here's a trivial example. The results, of course, depend on the schema on the curious server.

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
}, console.error);
```

The output from this example would look something like this, depending on the schema:
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
