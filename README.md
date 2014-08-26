Javascript consumer for Curious API outputs.

Use the CuriousClient.parse method to consume data obtained from a Curious query.  For example,

```
var q = "Book(id__in=[1,2,3]), Book.authors, Author.editors";
var url = CURIOUS_URL;
$http.post(url, {q: q, r: 1, d: 1, fk: 0}).success(function(resp) {
  var objects = CuriousClient.parse(['books', 'authors', 'editors'], resp.result, null);
  ...
});
```

In the callback, ```objects``` is now an array of dictionaries. ```objects[0]``` is a dictionary mapping ids to book objects, ```objects[1]``` is a dictionary mapping ids to author objects, and ```objects[2]``` is a dictionary mapping ids to editor objects.  Each book object has an ```authors``` array, containing the related author objects. Each author object has an ```editors``` array, containing the related editor objects. Inversely, each editor object has an ```authors``` array, containing list of related author objects, and each author object has a ```books``` array, containing a list of related book objects.

You can pass as the third argument an array of existing objects obtained from a previous query. This argument should correspond to the first argument. E.g. the first element of the third argument should be an array of books, the second element should be an array of authors, the third element should be an array of editors. CuriousClient.parse, in this case, will update existing objects with new relationships.
