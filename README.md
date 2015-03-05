
# Mongoose Audit Trail

Record any field change made to a mongoose model,
manually, do not use pre/post hooks.

Tested with mongoose 3.8.x

Instance Methods added to the original schema:
* getAudit
* getAuditVersion
* getAuditBetween
* getAuditDiffs
* saveAuditDiffs

options object:
```js
 {
   mongoose: require("mongoose"), // moongoose instance
   modelName: String,
   // add a label based on the object path
   // maybe your model change over time, this will keep a readable
   // path for users in your schema
   labelCallback: Function, // (path, doc) -> String
   // variable type of the changed. Useful for Date vs String
   typeCallback: Function, // (path, doc) -> String
   // user model to ref in the audit schema
   modelUser: String,
   // how to obtain the user that edited
   userCallback: Function // (path, doc) -> User
 }
```

## Usage / Example

```js
 audit(Schema, {
   modelName: "model_name",
   userName: "user_model_name",
   collection: "collection_audit",
   labelCallback: function(path, doc) {
     return path.toUpperCase();
   },
   typeCallback: function(path, doc) {
     return "string";
   },
   userCallback: function(path, doc) {
     return doc.owner;
   }
 });
```




##### `getAudit` (Function:callback)

Retrive all audit info

*Parameters:*

* `callback`: (err, result_arr)



<br /><br />

##### `getAuditVersion` (Number:v, Function:callback)

Retrive all audit info for a given version

*Parameters:*

* `v`

* `callback`: (err, result_arr)



<br /><br />

##### `getAuditBetween` (Number:v1, Number:v2, Function:callback)

Retrive all audit info for a given version range

*Parameters:*

* `v1`

* `v2`

* `callback`: (err, result_arr)



<br /><br />

##### `getAuditDiffs` (Object:obj) -> Array

Return an array with all the differents found.
Later that array should be sent to saveAuditDiffs when the object
it succesfully saved.

*Parameters:*

* `obj`: object to compare


*Returns:*

* `Array`


<br /><br />

##### `saveAuditDiffs` (Array:diffs, Function:callback)

Save audit differences into mongo

*Parameters:*

* `diffs`

* `callback`: (err, saved_data)



<br /><br />

# TODO

* Add test scripts (PR welcome)


# LICENSE

(The MIT License)

Copyright (c) 2015 Luis Lafuente Morales <llafuente@noboxout.com>
Copyright (c) 2015 Inetsys SLL

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


