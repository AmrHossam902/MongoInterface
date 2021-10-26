
class DbError extends Error {

    constructor(message){
        super(message);
        this.name = "DB_ERROR";
    }
}

class WriteError extends DbError{

    constructor(message, nInserted, nUpdated){
        super(message);
        this.name = "WRITE_ERROR";
        this.nInserted = nInserted;
        this.nUpdated = nUpdated;
    }
}

class UniqueIndexViolationError extends WriteError{
   
    constructor(message, nInserted, nUpdated){
        super(message, nInserted, nUpdated);
        this.name = "UNIQUE_INDEX_VIOLATION_ERROR";
    }
}

class SchemaViolationError extends WriteError{

    constructor(message, nInserted, nUpdated){
        super(message, nInserted, nUpdated);
        this.name = "SCHEMA_VIOLATION_ERROR";
    }
}

class ObjectExistenceError extends DbError{

    constructor(message){
        super(message);
        this.name = "OBJECT_EXISTENCE_ERROR";
    }
}

module.exports = {
    DbError,
    WriteError,
    SchemaViolationError,
    UniqueIndexViolationError,
    ObjectExistenceError
}