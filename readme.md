# MongoInterface
a simple mongodb interface in nodeJs offering simple functionalities<br>
that can save you alot of time when dealing with the Mongo driver

# Functions offered

## connect()
```returns : Promise<MongoCLient>```<br>
<pre>
it ensures that there is only a single instance
that is used for all operations
</pre>

## close()
<pre>
<b>returns : Promise&lt;void&gt;</b>
closes the client instance
</pre>

## insertObject(collection, object)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
inserts a new object into the specified collection,
result is different in case of success and failure
    success:
        { succeeded: true, insertedId: objectId}
    failure:
        { succeeded: false, type: "errorCode", msg: "error description"}
</pre>

## InsertMultipleObjects(collection, objArr)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
inserts multiple objects sequentially in a collection and stops with the first error,
result is different in terms of success and failure
    success:
        { succeeded: true, insertedIds: [objectId] }
    failure:
        { succeeded: false, type: "errorCode", msg: "error description"},
</pre>

## searchCollection(collection, filter, proj, sortObj, limit)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
searches a collection for a multiple objects using:
    filter : filter document used with mongodb
    proj : projection document in mongodb
    sortObj: sorting document in mongodb
    limit: number to limit the amount of the result

    success:
        { succeeded : true, data: array of found documents}
    failure:
        { succeeded : false, data: empty array } if nothing found
        { succeeded : false, type: "errorCode", message: "error description"} if another error occured
</pre>

## setField(collection, filter, fieldName, fieldValue)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
updates a specific document based on the filter to alter a field
named <b>fieldName</b> with the value in <b>fieldValue</b>,

    success:
        { succeeded : true }
    failure:
        { succeeded : false, type : "error code", message : "error description" }

</pre>

## insertIntoArrayField(collection, filter, arrayName, value)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
inserts <b>unique</b> data in array fields,
the operation succeeds indicating that value is inserted or it previously existed in arrayName,
and fails indicating that object determined by filter wasn't found
    success:
        { succeeded : true }
    failure:
        { succeeded : false, type : "error code", message : "error description" }
</pre>

## removeFromArrayField(collection, filter, arrayName, value)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
removes an element from an array field,
the operation succeeds indicating that element is no more existent in 
the array whether it existed before or not,
and fails indicating that the document is not found
    success:
        { succeeded : true }
    failure:
        { succeeded : false, type : "error code", message : "error description" }
</pre>

## deleteObject(collection, filter)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
deletes an object from a collection
    success:
        { succeeded : true,  deletedCount : 1}
    failure:
        { succeeded : false. type: "errorCode", message: "error description" } if object not found
</pre>

## dropCollection(collection)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
drops an entire collection
    success:
        { succeeded : true}
    failure:
        { succeeded : false. type: "errorCode", message: "error description" } if collection isn't found
</pre>