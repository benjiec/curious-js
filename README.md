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
var curiousClient = new CuriousClient(CURIOUS_URL, CuriousClient.wrappers.axios(axios), ...);
```

Then, construct a `CuriousQuery` and perform it on the server using the client.
Attach any callbacks to the Promise object returned by the `perform` method. The
results of the query will be passed to the callback:

```javascript
var q = new curious.CuriousQuery('Experiment(id=302)', 'experiment')
  .follow('Experiment.reaction_set', 'reactions')
  .follow('Reaction.dataset_set', 'dataset', Dataset)
  .follow('Dataset.attachment_set');

q.perform(curiousClient).then(function (queriedData) {
  // Do stuff with queriedData
});
```

The detailed API is explained in the documentation.
