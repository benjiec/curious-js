Javascript consumer for Curious API outputs.

Use the CuriousObjects.parse method to consume data obtained from a Curious query.  For example,

```
var q = "Book(id__in=[1,2,3]), Book.authors, Author.editors";
var url = CURIOUS_URL;
$http.post(url, {q: q, x: 1, d: 1, fk: 0}).success(function(resp) {
  var objects = CuriousObjects.parse(['books', 'authors', 'editors'], resp.result, null);
  ...
});
```

In the callback, ```objects``` is now an array of dictionaries. ```objects[0]``` is a dictionary mapping ids to book objects, ```objects[1]``` is a dictionary mapping ids to author objects, and ```objects[2]``` is a dictionary mapping ids to editor objects.  Each book object has an ```authors``` array, containing the related author objects. Each author object has an ```editors``` array, containing the related editor objects. Inversely, each editor object has an ```authors``` array, containing list of related author objects, and each author object has a ```books``` array, containing a list of related book objects.

You can pass as the third argument an array of existing objects obtained from a previous query. This argument should correspond to the first argument. E.g. the first element of the third argument should be an array of books, the second element should be an array of authors, the third element should be an array of editors. CuriousObjects.parse, in this case, will update existing objects with new relationships.

Use the CuriousQ to issue a query and get back objects.  For example,

```
var clt = CuriousQ(CURIOUS_URL, $http);
var q = "Book(id__in=[1,2,3]), Book.authors, Author.editors";
clt.get(q, ['books', 'authors', 'editors'],
        function(objects) {
          ...
        });
```

If you are using angular, you can create a factory using CuriousQ. For example

```
app.factory('curiousClient', function($http) { return CuriousQ(CURIOUS_URL, $http); });
```

Then in your controller, with ```curiousClient``` injected, you can call

```curiousClient.get(...)```

Other helpers:

```
var clt = CuriousQ(CURIOUS_URL, $http);

// pass in an array of existing object arrays, one object array for each
// relationship. relationships will be added to existing objects.
clt.get_with_objs(query, relationships, existing_object_arrays, cb);

// pass in an array of existing objects corresponding to the first relationships.
clt.get_with_start(query, relationships, starting_object_arrays, cb);
```
