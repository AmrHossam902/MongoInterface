const mongo = require("mongodb");
const {ObjectExistenceError, UniqueIndexViolationError, SchemaViolationError, DbError, WriteError} = require("./errors/errors");
function DbInterface(dbname, url){
    this.dbname = dbname;
    this.url = url;
    /**
     * @type {mongo.MongoClient}
     */
    this.client = null;
}


/**
 * returns MongoCLient needed for different database operations
 * @returns {Promise<mongo.MongoClient>} mongoclient
 */
DbInterface.prototype.connect = async function(){
    if(this.client)
        return this.client;
    return this.client = (new mongo.MongoClient(this.url)).connect();
}

/**
 * call this function to end the connection of the interface
 * @returns {void}
 */
DbInterface.prototype.close = function(){
    return this.connect().then(client=>{
        return client.close();
    });
}

/**
 * this function aims to insert a new object in the collection
 * @param {string} collection name of the collection to insert in
 * @param {object} object object contains the properties
 *  to be inserted in the collection
 * @returns {Promise<{ insertedId: mongo.ObjectId}>} id of the new object in the database
 * @throws {UniqueIndexViolationError, SchemaViolationError, DbError}
 */
DbInterface.prototype.insertObject = function(collection, object){

    return this.connect().then( (client) => {
        return client.db(this.dbname).collection(collection).insertOne(object);
    })
    .then( (result) => {
        return { insertedId : result.insertedId };
    })
    .catch( (reason) => {
        if(reason.code == 11000)
            throw new UniqueIndexViolationError(reason.errmsg, 0, 0);
        else if(reason.code == 121)
            throw new SchemaViolationError(reason.errmsg, 0, 0);
        else
            throw new DbError(reason.errmsg);
    });
}

/**
 * insert multiple objects into a collection one by one, and stops insertion with the 
 * first error
 * @param {mongo.Collection} collection collection to insert into 
 * @param {Array<Object>}>} objectsArr array of objects to insert into a collection
 * @returns {Promise<{insertedIds: mongo.ObjectId []}>}
 * @throws { UniqueIndexViolationError, SchemaViolationError, DbError}
 */
DbInterface.prototype.insertMultipleObjects = function(collection, objectsArr){

    return this.connect()
    .then( (client) =>{
        return client.db(this.dbname).collection(collection).insertMany(objectsArr);
    })
    .then( (result)=> {
        return { insertedIds: result.insertedIds}
    })
    .catch( (reason) => {
        const nInserted = reason.result.result.nInserted;
        if(reason.code == 11000)
            throw new UniqueIndexViolationError(reason.errmsg, nInserted, 0);
        else if(reason.code == 121)
            throw new SchemaViolationError(reason.errmsg, nInserted, 0);
        else
            throw new DbError(reason.errmsg);
    });
}

/**
 * 
 * @param {string} collection name of the collection to search in.
 * @param {object} filter query object used for selection e.g.{ name: "ali"}
 * @param {object} project object determines which fields to include
 *                          in the result e.g. {name:1, id:1}
 * @param {object} sortObj object determines how to sort the result e.g.{id:1, name:-1}
 * @param {number} limit limiting the number of returned documents in the result
 * @returns {Promise<{data: object[]}>} the objects that match the selection criteria
 * @throws {DbError} 
 */
DbInterface.prototype.searchCollection = function(collection, filter, project, sortObj, limit, page){
    return this.connect()
    .then( (client)=>{
        if(filter == undefined || typeof filter !== "object") filter = {};
        if(sortObj == undefined || typeof sortObj !== "object") sortObj = {};
        if(limit == undefined || typeof limit !== "number") limit = 0;
        if(project == undefined || typeof project !== "object") project = {};
        if(page == undefined || typeof page !== "number") page = 0;
        return client.db(this.dbname).collection(collection).find(filter).project(project).sort(sortObj).skip(page * limit).limit(limit);
    })
    .then( async (cursor)=> {
        let array = await cursor.toArray();
        return { data: array}
    })
    .catch( (reason)=>{
        throw new DbError(reason.errmsg);
    });
}

/**
 * this function updates a single field in a single document with a value
 * @param {string} collection string identifiying collection to operate on
 * @param {object} filter object containing the selection criteria of the document
 * @param {string} fieldName name of the field to update
 * @param {any} fieldValue value of the field to update with
 * @returns {true}
 * @throws {UniqueIndexViolationError, SchemaViolationError, ObjectExistenceError, DbError}
 */
DbInterface.prototype.setField = function(collection, filter, fieldName, fieldValue){

    return this.connect()
    .then( (client) => {
        return client.db(this.dbname).collection(collection).updateOne(filter, { "$set" : {[fieldName] : fieldValue}});
    })
    .then( (result)=>{
        if(result.modifiedCount)
            return true;
        else
            throw result;
    })
    .catch( (reason)=>{

        if(reason.code == 11000)
            throw new UniqueIndexViolationError(`the value "${fieldValue}" is duplicated in another document for "${fieldName}""`, 0, 0);
        else if(reason.code == 121)
            throw new SchemaViolationError(`the value "${fieldValue}" doesn't comply with the collection schema of "${collection}"`, 0, 0);
        else if(reason.matchedCount === 0)
            throw new ObjectExistenceError(`the object to be modified is not found given this criteria ${JSON.stringify(filter)}`);
        else
            throw new DbError(reason.errmsg);

    });    
}

/**
 * inserts data into fields of type array and makes sure that the array contains 
 * unique data
 * @param {string} collection name of the collection to operate on
 * @param {object} filter object containing the selection criteria 
 * @param {string} arrayName name of the field to update
 * @param {any} value value to insert into the array
 * @returns {true}
 * @throws {SchemaViolationError, ObjectExistenceError, DbError}
 */
DbInterface.prototype.insertIntoArrayField = function(collection, filter, arrayName, value){
    return this.connect()
    .then((client)=>{
        return client.db(this.dbname).collection(collection).updateOne(filter, {$addToSet:{[arrayName]: value}});
    })
    .then((result)=>{
        if(result.acknowledged && result.matchedCount)
            return true;
        else
            throw result;
    })
    .catch((reason)=>{

        if(reason.code == 121)
            throw new SchemaViolationError(`the value "${value}" doesn't comply with the collection schema of "${collection}"`, 0, 0);
        else if(reason.matchedCount === 0)
            throw new ObjectExistenceError(`the object to be modified is not found given this criteria ${JSON.stringify(filter)}`);
        else
            throw new DbError(reason.errmsg);
    });
}

/**
 * this function is used to remove all items identified by value param from an arrayfield
 * @param {string} collection collection name to operate on
 * @param {object} filter object used to filter documents of a collection
 * @param {string} arrayName name of the array to remove items from
 * @param {any} value value to be removed from the array
 * @returns {true}
 * @throws { ObjectExistenceError, DbError}
 */
DbInterface.prototype.removeFromArrayField = function(collection, filter, arrayName, value){
    return this.connect()
    .then((client)=>{
        return client.db(this.dbname).collection(collection).updateOne(filter, { "$pull" : { [arrayName] : value}});
    })
    .then((result)=>{
        if(result.acknowledged && result.matchedCount)
            return true
        else
            throw result;
    })
    .catch((reason)=>{
        if(reason.matchedCount === 0)
            throw new ObjectExistenceError(`the object to be modified is not found given this criteria ${JSON.stringify(filter)}`);
        else
            throw new DbError(reason.errmsg);
    });
}

/**
 * removes a collection from database
 * @param {string} collection name of the collection to drop
 * @returns {true}
 * @throws {DbError}
 */
DbInterface.prototype.dropCollection = function(collection){
    
    return this.connect()
    .then((client)=>{
        return client.db(this.dbname).collection(collection).drop();
    })
    .then((result)=>{
        return true 
    })
    .catch( function(reason){
        throw new DbError(reason.errmsg);
    });
}

/**
 * deletes a single object from a collection
 * @param {string} collection collection to delete object from
 * @param {object} filter filter object used to select the element to be deleted
 * @returns {Promise<{nDeleted: number}>}
 * @throws {DbError} in case error occurs while db operation
 */
DbInterface.prototype.deleteObject = function(collection, filter){
    return this.connect()
    .then((client)=>{
        return client.db(this.dbname).collection(collection).deleteOne(filter);
    })
    .then( (result) => {
        if(result.acknowledged)
            return { nDeleted: result.deletedCount };
    })
    .catch( (reason) => {
        throw new DbError(reason.errmsg);
    });
}

module.exports = DbInterface;
