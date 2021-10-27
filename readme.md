# MongoInterface
a simple mongodb interface in nodeJs offering simple functionalities<br>
that can save you alot of time when dealing with the MongoDB native driver<br>
<b>check the test file for examples at: </b>[tests](test/mongo-interface.test.js)
# Functions offered

## connect()
<pre>
<b>returns : Promise&lt;MongoClient&gt;</b>
it ensures that there is only a single instance
that is used for all operations
</pre>

## close()
<pre>
<b>returns : Promise&lt;void&gt;</b>
closes the client interface
</pre>

## insertObject(collection, object)
<pre id="insert-object">
<b>returns : Promise&lt;Object&gt;</b>
inserts a new object into the specified collection,
result is different in case of success and failure
    success:
        { insertedId: objectId}
    failure:
        throws { 
            UniqueIndexViolationError,
            SchemaViolationError,
            DbError
        }
</pre>

## InsertMultipleObjects(collection, objArr)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
inserts multiple objects sequentially in a collection and stops with the first error,
result is different in terms of success and failure
    success:
        { insertedIds: objectId[] }
    failure:
        throws {
            UniqueIndexViolationError,
            SchemaViolationError,
            DbError
        }
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
        {data: array of found documents}
    failure:
        throws {
            DbError
        }
    Note that if nothing is found, the situation will be considered
    a success and the returned array will be empty 
</pre>

## setField(collection, filter, fieldName, fieldValue)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
updates a specific document based on the filter to alter a field
named <b>fieldName</b> with the value in <b>fieldValue</b>

    success:
        { succeeded : true }
    failure:
        throws: {
            UniqueIndexViolationError,
            SchemaViolationError,
            ObjectExistenceError,
            DbError
        }

</pre>

## insertIntoArrayField(collection, filter, arrayName, value)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
inserts <b>unique</b> data in array fields
and makes sure that there are no duplicates,
the operation succeeds indicating that value is inserted or it previously existed in arrayName
    success:
        { succeeded : true }
    failure:
        throws {
            SchemaViolationError,
            ObjectExistenceError,
            DbError
        }
</pre>

## removeFromArrayField(collection, filter, arrayName, value)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
removes all elements identified by value from an array field,
the operation succeeds indicating that element is no more existent in 
the array whether it existed in the array before or not,
and fails indicating that the document is not found
    success:
        { succeeded : true }
    failure:
        throws {
            ObjectExistenceError,
            DbError
        }
</pre>

## deleteObject(collection, filter)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
 deletes a single object from a collection
    success:
        { nDeleted : 1}
    failure:
        throws {DbError}
    note that if nothing is found in the collection to be deleted,
    nDeleted will be 0, and the situation will be considered a success
</pre>

## dropCollection(collection)
<pre>
<b>returns : Promise&lt;Object&gt;</b>
drops an entire collection, if the collection exists the result is success
, otherwise DbError is thrown
    success:
        { succeeded : true}
    failure:
        throws {DbError}
</pre>


# Errors

## DbError 
<pre>
    this is the most basic version of errors, it will be thrown in case of any error
    that is not handled by the following error types
</pre>

## WriteError
<b>extends DbError</b>
<pre>
    it indicates that an error happened while a write or update operation,
    <b>e.g.</b> error while insertObject or setField
</pre>

## UniqueIndexViolationError
<b>extends WriteError</b>
<pre>
    it's a form of a writeError, thrown when attempting to insert or update
    a document in a collection and the result contradicts with a unique index in that collection
</pre>

## SchemaViolationError
<b>extends WriteError</b>
<pre>
    it's a form of a writeError, thrown when attempting to insert or update
    a document in a collection and the result contradicts with a schema in that
    collection
</pre>

## ObjectExistenceError
<b>extends DbError</b>
<pre>
    this error is used in cases where its's essential that the object exists
    before the operation, like setField, insertIntoArrayField.
    it indicates that the object tha you want to operate on actually doesn't exist in
    the collection.
</pre>