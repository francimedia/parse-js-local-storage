Parse JavaScript Client + Local Storage 
========================
Use HTML5 Local Storage Engine to cache/queue Parse Objects and send them to Parse servers later.

Parse Docs: https://www.parse.com/docs/js_guide

##Example usages

* Save requests while user doesn't have a cell connection
* Reduce number of Parse write requests (saves $$$)

###Add Object to Queue
```javascript
var TestObject = Parse.Object.extend("TestObject");
var testObject = new TestObject();
testObject.save({foo: "bar"});

Parse.LocalStorage.save("TestObject", testObject);
```
###Send Queue to Parse Server
```javascript
Parse.LocalStorage.sendQueue();
```
You can send the queue either right after adding an object or on connect (or other events).
###Clear Queue
```javascript
Parse.LocalStorage.clearQueue();
```
In the current version you have to clear the queue manually. If you do not use unique hashes or object IDs not clearing the queue will result in duplicate DB entries.
