const assert = require("assert");
const DbInterface = require("../mongo-interface");
const { describe, it} = require("mocha");
const mongodb = require('mongodb');
const {
    WriteError,
    ObjectExistenceError,
    UniqueIndexViolationError,
    SchemaViolationError
} = require("../errors/errors");

const dbName = "social";
const collName = "person";
const dbUrl = "mongodb://localhost:27017";


/**
 * @type {DbInterface}
 */
let DB; //instance of the interface to test

/**
 * this test is based on this schema
 * Person collection
 * {
 *      name: string, unique
 *      code: string, formed of 6 digits no more no less
 *      friends: [] array of strings
 * }
 */

before((done)=>{
    DB = new DbInterface(dbName, dbUrl);
    done();
});
beforeEach(()=>{
  return   new (require("mongodb").MongoClient)(dbUrl).connect()
    .then( (client) =>{
        return client.db(dbName).dropDatabase()
        .then(()=>{
            return client.db(dbName).createCollection(collName, {
                'validator' : {
                    '$jsonSchema' : {
                        'bsonType' : 'object',
                        'required' : ['name', 'code', 'friends'],
                        'properties' : {
                            'name' : {
                                'bsonType' : 'string'
                            },
                            'code' : {
                                'bsonType' : 'string',
                                'pattern' : '^[0-9]{6}$'
                            },
                            'friends' : {
                                'bsonType' : 'array',
                                'items' : {
                                    'bsonType' : 'string'
                                }
                            }
                        }
                }
                }}
            );
        })
        .then( (result)=>{
            return client.db(dbName).collection(collName).createIndex({"name" : 1}, {"unique": true})
            .then(()=>{
                return client.close();
            })
        })
        .catch((err)=>{
            return client.close();
        })
    })
});
after(()=>{
    return DB.close();
});


describe("Testing DB interface", function(){
    
    describe('\n---------Inserting single object----------', function(){
        describe('Inserting Correct format', function(){
            it("should return object with insertedId", function(){
                return DB.insertObject(collName, {"name": "Amr", "code": "213543", "friends": []})
                .then(result=>{
                    assert.ok(result.insertedId, "insertedId not found in result");
                });
            });
        });
    
        describe("Inserting Duplicated object", function(){
            it("should return UNIQUE_INDEX_VIOLATION_ERROR", function(){
                return new mongodb.MongoClient(dbUrl).connect()
                .then((client)=>{
                    //insert the very first user in the database
                    return client.db(dbName).collection(collName).insertOne({"name": "Amr", "code": "324123", "friends":[]})
                    .then(()=>{
                        return DB.insertObject(collName, {"name": "Amr", "code": "324123", "friends":[]})
                        .catch((reason)=>{
                            assert.equal(reason.name, "UNIQUE_INDEX_VIOLATION_ERROR");
                        });
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
                
            });
        });
    
        describe("leaving out required field", function(){
            it("should return SCHEMA_VIOLATION_ERROR", function(){
                return DB.insertObject("person", {"name": "amr", "friends":[]})
                .catch(reason=>{
                    assert.equal(reason.name, "SCHEMA_VIOLATION_ERROR");
                });
            });
        });
    
        describe("inserting incorrect bson type", function(){
            it("should return SCHEMA_VIOLATION_ERROR", function(){
                return DB.insertObject('person', {"name": 34, code:"234321", friends:[]})
                .catch(reason=>{
                    assert.equal(reason.name, "SCHEMA_VIOLATION_ERROR");
                })
            })
        });
    
    });
    
    describe('\n--------Inserting Multiple objects--------', function(){
        describe('Inserting Multiple correct objects', function(){
            it("should return object with inserted ids array", function(){
                return DB.insertMultipleObjects('person', [
                    {
                        "name":"Amr",
                        "code" : "234567",
                        "friends" : []
                    },{
                        "name": "ayman",
                        "code":"342212",
                        "friends": []
                    }
                ])
                .then(result=>{
                    assert.equal(Object.keys(result.insertedIds).length , 2);
                })
            });
        });

        describe('Inserting 3 elements 1st,2nd correct and 3rd is falsy', function(){
            it('should return', function(){
                return DB.insertMultipleObjects(collName, [
                    {
                        name: "amr",
                        code: "232543",
                        friends:[]
                    },
                    {
                        name: "ayman",
                        code: "232543",
                        friends:[]
                    },
                    {
                        name: "amr",
                        code: "232543",
                        friends:[]
                    },
                ])
                .catch((reason)=>{
                    assert.equal( reason.nInserted, 2);
                });
            });
        });

        describe('Inserting 3 elements 1st falsy, 2nd and 3rd are truthy', function(){
            it('should return DbError and ninserted = 0', function(){
                //any falsy document will stop the insertion operation, and the
                // rest docs will not be inserted even if they are truthy
                return DB.insertMultipleObjects(collName, [
                    {
                        name: "amr",
                        code: 232543, //incorrect bson type
                        friends:[]
                    },
                    {
                        name: "ayman",
                        code: "232543",
                        friends:[]
                    },
                    {
                        name: "hnry",
                        code: "232543",
                        friends:[]
                    },

                ])
                .catch(function(reason){
                    assert.equal(reason.nInserted, 0);
                });
            });
        });
    });

    describe('\n---------Searching a collection----------', function(){
        describe("searching for existing element", function(){
            it('should return array of matched objects found', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"Amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.searchCollection(collName, {name:"Amr"});
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(function(result){
                        assert.equal(result.data[0].name, "Amr");
                        assert.equal(result.data[0].code, "234567")
                    })
                    .finally(()=>{
                        return client.close();
                    })
                    
                });
            });
        });

        describe("searching for multiple elements", function(){
            it('should return objects that typically match the crireria', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"Amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"234567",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.searchCollection(collName, {code:"234567"});
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(function(result){
                        assert.equal(result.data[0].code, "234567");
                        assert.equal(result.data[1].code, "234567")
                    })
                    .finally(()=>{
                        return client.close();
                    })
                    
                });
            });
        });

        describe("searching for element using projection object", function(){
            it('should find the object and return only projected fields', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"Amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.searchCollection(collName, {name:"Amr"}, {name:1});
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(function(result){
        
                        assert.equal(result.data[0].name, "Amr");
                        //code, friends shouldn't exist in result
                        assert.equal(result.data[0].code, undefined);
                        assert.equal(result.data[0].friends, undefined);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });

            });
        });

        describe("searching for element using sort object", function(){
            it('should find the object and return data sorted', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "moon",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.searchCollection(collName, {}, undefined, {name:1});
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(function(result){
                        assert.equal(result.data[0].name, "amr");
                        //code, friends shouldn't exist in result
                        assert.equal(result.data[1].name, "hussein");
                        assert.equal(result.data[2].name, "moon");
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });

            });
        });

        describe("searching for element and limiting result", function(){
            it('should find the object and return only the specified limit', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "moon",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.searchCollection(collName, {}, undefined, undefined, 2);
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(function(result){

                        assert.equal(result.data.length, 2);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });

            });
        });

        describe("Serching for non existent document", function(){
            it('should return empty data array', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "moon",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.searchCollection(collName, {name:"ali"});
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(function(result){
                        assert.equal(result.data.length, 0);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });

            });
        });
    });

    describe('\n----------updating a document-------------', function(){
        
        describe('updating a single field in an existing document', function(){
            it("should return true and only a single document is affected", function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.setField(collName, {name: "ayman"}, "code", "333333");
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(async function(result){
                        assert.equal(result, true);
                        let data = await client.db(dbName).collection(collName).find().toArray();
                    
                        assert.equal(data[1].code, "333333");
                        assert.equal(data[1].name, "ayman");

                        assert.equal(data[0].code, "234567");
                        assert.equal(data[2].code, "543987")
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('updating a non existing document', function(){
            it('should return OBJECT_EXISTENCE_ERROR', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.setField(collName, {name: "salem"}, "code", "333333");
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .catch(async function(reason){
                        assert.ok(reason.name == "OBJECT_EXISTENCE_ERROR");
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('updating a unique field to make it duplicated', function(){
            it('should return UNIQUE_INDEX_VIOLATION_ERROR', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.setField(collName, {name: "ayman"}, "name", "amr");
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .catch(async function(reason){
                        assert.ok(reason.name == "UNIQUE_INDEX_VIOLATION_ERROR");
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            })
        });

        describe('updating a field with incompatible data', function(){
            it('should return SCHEMA_VIOLATION_ERROR', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.setField(collName, {name: "ayman"}, "name", 30);
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .catch(async function(reason){
                        assert.ok(reason.name == "SCHEMA_VIOLATION_ERROR");
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            })
        });


    });

    describe('\n------------updating arrays---------------', function(){
        describe('Inserting into an array field', function(){
            it('should return true and data should get inserted in the array', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : []
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.insertIntoArrayField(collName, {name:'amr'}, "friends", "ayman");
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(async function(result){
                        assert.equal(result, true);
                        let data = await client.db(dbName).collection(collName).findOne({name:"amr"});
                        assert.notEqual( data.friends.indexOf('ayman'),-1 );
                    })
                    .finally(()=>{
                        return client.close();
                    });
                }); 
            });
        });
        
        describe('Inserting duplicate elements into an array', function(){
            it('should return true, no duplicates to be found in the array', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.insertIntoArrayField(collName, {name:'amr'}, "friends", "ayman");
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(async function(result){
                        assert.equal(result, true);
                        let data = await client.db(dbName).collection(collName).findOne({name:"amr"});
                        assert.equal(data.friends.length, 1);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('Inserting into an array using non existing key', function(){
            it('should return OBJECT_EXISTENCE_ERROR', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.insertIntoArrayField(collName, {name:'mahmoud'}, "friends", "ayman");
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .catch(async function(reason){
                        assert.equal(reason.name, 'OBJECT_EXISTENCE_ERROR');
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('Inserting into an array an invalid value', function(){
            it('should return SCHEMA_VIOLATION_ERROR', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.insertIntoArrayField(collName, {name:'amr'}, "friends", 34);
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .catch(async function(reason){
            
                        assert.equal(reason.name, 'SCHEMA_VIOLATION_ERROR');
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('Removing from an array', function(){
            it("should return true and element must dissapear from the array", function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ali"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.removeFromArrayField(collName, {name:"amr"}, 'friends', 'ali');
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(async function(result){
                        assert.equal(result, true);
                        let data = await client.db(dbName).collection(collName).findOne({name:"amr"});
                        assert.equal(data.friends.length, 0);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('Removing from an array an element that doesn\'t exist', function(){
            it('should return true indicating that element doesn\'texist in the array', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman", "ali"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.removeFromArrayField(collName, {name:"amr"}, 'friends', 'sami');
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .catch(async function(result){
                        assert.equal(result, true);
                        let data = await client.db(dbName).collection(collName).findOne({name:"amr"});
                        assert.equal(data.friends.length, 2);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('Removing from an array in a non existing document', function(){
            it('should return  OBJECT_EXISTENCE_ERROR', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman", "ali"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.removeFromArrayField(collName, {name:"mahmoud"}, 'friends', 'ayman');
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .catch(async function(reason){
                        assert.equal(reason.name, 'OBJECT_EXISTENCE_ERROR');
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

    });

    describe('\n------------Deleting Objects---------------', function(){

        describe('Deleting a single object', function(){
            it('should return nDeleted = 1 ,object must disappear from the collection', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.deleteObject(collName, {name:"ayman"})
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(async function(result){
                        assert.equal(result.nDeleted, 1);
                        let data = await client.db(dbName).collection(collName).find().toArray();
                        assert.equal(Object.keys(data).length, 2);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('Deleting a single object with a non existing key', function(){
            it('should return nDeleted = 0', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.deleteObject(collName, {name:"harry"})
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(async function(result){
                        
                        assert.equal(result.nDeleted, 0);
                        let data = await client.db(dbName).collection(collName).find().toArray();
                        assert.equal(Object.keys(data).length, 3);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });
    });

    describe('\n----------Dropping collection--------------', function(){
        describe('deleting exiting collection', function(){
            it('should return true , collection disappears from database', function(){
                return new (require('mongodb').MongoClient)(dbUrl).connect()
                .then( function(client){
                    return client.db(dbName).collection(collName).insertMany([
                        {
                            "name":"amr",
                            "code" : "234567",
                            "friends" : ["ayman"]
                        },{
                            "name": "ayman",
                            "code":"342212",
                            "friends": []
                        },{
                            "name": "hussein",
                            "code": "543987",
                            "friends": []
                        }
                    ])
                    .then(function(result) {
                        if(Object.keys(result.insertedIds).length == 3)
                            return DB.dropCollection(collName);
                        else
                            return Promise.reject(new Error("INSERTION_FAILURE"));
                    })
                    .then(async function(result){
                        assert.equal(result, true);
                        
                        let data = await client.db(dbName).collections();
                        assert.equal(data.length, 0);
                    })
                    .finally(()=>{
                        return client.close();
                    });
                });
            });
        });

        describe('deleting non exiting collection', function(){
            it('should return Db_ERROR', function(){
                return DB.dropCollection('dummy')
                .catch(async (reason)=>{
                    assert.equal(reason.name, "DB_ERROR");
                    const client = await new (require('mongodb').MongoClient)(dbUrl).connect();
                    const collections = await client.db(dbName).collections();
                    assert.equal(collections.length, 1);
                    await client.close();
                });
            });
        });
    });

});