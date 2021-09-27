# MongoInterface
a simple mongodb interface in nodeJs offering simple functionalities<br>
that can save you alot of time when dealing with the Mongo driver

## Functions offered

- ## connect()
&emsp;&emsp;&emsp;&emsp;```returns : Promise<MongoCLient>```<br>
<pre>
it ensures that there is only a single instance
that is used for all operations
</pre>

- ## close()
- &emsp;```returns : Promise<void>```
  &emsp; closes the client instance
- ## insertObject( collection, object )
  &emsp;```returns : Promise<Object>```

- ## InsertMultipleObjects
- ## 