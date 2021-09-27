const mongo = require("mongodb");

function DbInterface(dbname, url){
    this.dbname = dbname;
    this.url = url;
    /**
     * @type {mongo.MongoClient}
     */
    this.client = null;
}


/**
 * this function aims to insert a new object in the collection
 * @param {string} collection name of the collection to insert in
 * @param {object} object object contains the properties
 *  to be inserted in the collection
 * @returns {Promise<{succeeded:boolean,
 *                    type:string|number,
 *                    message:string}>
 *}
 * type identifies the error type,
 * message describes the actual error that happened
 */

/**
 * returns MongoCLient needed for different database operations
 * @returns {Promise<mongo.MongoClient>} mongoclient
 */
DbInterface.prototype.connect = async function(){
    if(this.client)
        return this.client;
    return this.client = (new mongo.MongoClient(this.url)).connect();
}

DbInterface.prototype.close = function(){
    return this.connect().then(client=>{
        return client.close();
    });
}

DbInterface.prototype.insertObject = function(collection, object){

    return this.connect().then( (client) => {
        return client.db(this.dbname).collection(collection).insertOne(object);
    })
    .then( (result) => {
        return { succeeded : true, insertedId : result.insertedId };
    })
    .catch( (reason) => {
        if(reason.code == 11000)
            return { succeeded : false, type: 'UNIQUE_FIELD_ERROR', message: reason.errmsg};
        else if(reason.code == 121)
            return { succeeded : false, type: 'SCHEMA_VALIDATION_ERROR', message: reason.errmsg};
        else
            return { succeeded : false, type: reason.code, message: reason.errmsg };
    });
}

/**
 * insert multiple objects into a collection
 * @param {mongo.Collection} collection collection to insert into 
 * @param {Array<Object>}>} objectsArr array of objects to insert into a collection
 * @returns {Promise<{
 *              succeeded:true,
 *              insertedIds:object
 * }>|Promise<{
 *              succeeded:false,
 *              type: string|number,
 *              message: string,
 *              insertedCount:number
 * }>}
 * the 1st form is when the insertion of all elements succeeds,
 * the 2nd in which any kind of error happend, some elemnts may get inserted successfully 
 * in this case as well
 */
DbInterface.prototype.insertMultipleObjects = function(collection, objectsArr){

    return this.connect()
    .then( (client) =>{
        return client.db(this.dbname).collection(collection).insertMany(objectsArr);
    })
    .then( (result)=> {
        return { succeeded : true, insertedIds: result.insertedIds}
    })
    .catch( (reason) => {
        if(reason.code == 11000)
            return { succeeded : false,  type: "UNIQUE_FIELD_ERROR", message: reason.errmsg, insertedCount: reason.insertedCount};
        else if(reason.code == 121)
            return { succeeded : false, type: "SCHEMA_VALIDATION_ERROR", message: reason.errmsg, insertedCount: reason.insertedCount};
        return { succeeded : false, type: reason.code, message: reason.errmsg, insertedCount: reason.insertedCount}
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
 * @returns {Promise<{succeeded: boolean, data: object[]}>|
 *          Promise<{succeeded: boolean, type:number, message:string}>
 * }
 */
DbInterface.prototype.searchCollection = function(collection, filter, project, sortObj, limit){
    return this.connect()
    .then( (client)=>{
        if(filter == undefined || typeof filter !== "object") filter = {};
        if(sortObj == undefined || typeof sortObj !== "object") sortObj = {};
        if(limit == undefined || typeof limit !== "number") limit = 0;
        if(project == undefined || typeof project !== "object") project = {};
        return client.db(this.dbname).collection(collection).find(filter).project(project).sort(sortObj).limit(limit);
    })
    .then( async (cursor)=> {
        let array = await cursor.toArray();
        return { succeeded : ( (array.length)? true : false),  data: array}
    })
    .catch( (reason)=>{
        return { succeeded : false, type: reason.code,  message:reason.message };
    });
}

DbInterface.prototype.setField = function(collection, filter, fieldName, fieldValue){

    return this.connect()
    .then( (client) => {
        return client.db(this.dbname).collection(collection).updateOne(filter, { "$set" : {[fieldName] : fieldValue}});
    })
    .then( (result)=>{
        if(result.matchedCount)
            return { succeeded:true }
        else
            return { succeeded:false, type: "OBJECT_EXISTENCE_ERROR", message: "object not found"}
    })
    .catch( (reason)=>{
        return { succeeded:false, type: reason.code ,message: reason.message};
    });    
}

/**
 * inserts data into fields of type array and makes sure that the array contains 
 * unique data
 * @param {string} collection 
 * @param {object} filter 
 * @param {string} arrayName 
 * @param {any} value 
 * @returns 
 */
 DbInterface.prototype.insertIntoArrayField = function(collection, filter, arrayName, value){
    return this.connect()
    .then((client)=>{
        return client.db(this.dbname).collection(collection).updateOne(filter, {$addToSet:{[arrayName]: value}});
    })
    .then((result)=>{
        if(result.matchedCount)
            return {succeeded: true};
        else
            return { succeeded:false, type: "OBJECT_EXISTENCE_ERROR", message: "object not found"};
    })
    .catch((reason)=>{
        return { succeeded : false, type: reason.code, message: reason.message};
    });
}

DbInterface.prototype.removeFromArrayField = function(collection, filter, arrayName, value){
    return this.connect()
    .then((client)=>{
        return client.db(this.dbname).collection(collection).updateOne(filter, { "$pull" : { [arrayName] : value}});
    })
    .then((result)=>{
        if(result.matchedCount)
            return {succeeded: true};
        else
            return { succeeded:false, type: "OBJECT_EXISTENCE_ERROR", message: "object not found"};
    })
    .catch((reason)=>{
        return { succeeded : false, type:reason.code, message: reason.message};
    });
}


DbInterface.prototype.dropCollection = function(collection){
    
    return this.connect()
    .then(function(client){
        return client.db(this.dbname).collection(collection).drop();
    })
    .then( function(result){
        return { succeeded : true }
    })
    .catch( function(reason){
        return { succeeded : false, type: reason.code, message : reason.message }
    });
}

DbInterface.prototype.deleteObject = function(collection, filter){
    return this.connect()
    .then((client)=>{
        return client.db(this.dbname).collection(collection).deleteOne(filter);
    })
    .then( (result) => {
        if(result.deletedCount)
            return { succeeded: true, deletedCount: result.deletedCount };
        else
            return { succeeded: false, type: "OBJECT_EXISTENCE_ERROR", message: "document not found"}
    })
    .catch( (reason) => {
        return { succeeded: false, type: reason.code, message: reason.message };
    });
}

module.exports = DbInterface;