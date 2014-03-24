Parse.LocalStorage = {
    localStorageKey: "Parse.LocalStorage.Queue",
    initialize: function () {

    },
    save: function (objectType, object) {
        this.addToQueue('save', objectType, object);
    },
    addToQueue: function (action, objectType, object) {
        var queueData = this.getQueue();  
        // create queueId to avoid duplicates. Maintain previously saved data.
        var queueId = ([objectType, object.id, object.get('hash')]).join('_');
        var i = this.queueItemExists(queueData, queueId);
        if(i > -1) {
            for (var prop in queueData[i].data) {
                if(object.get(prop) == 'undefined') {
                   object.set(prop, queueData[i].data[prop]);
                }
            }
        } else {
            i = queueData.length;
        }
        queueData[i] = {
            queueId: queueId,
            type: objectType,
            action: action,
            id: object.id,
            hash: object.get('hash'),
            createdAt: new Date(),
            data: object
        };        
        this.setQueue(queueData);
    },
    getQueue: function () {
        var queueData = eval(localStorage.getItem(this.localStorageKey));
        return typeof queueData == 'object' ? queueData : [];
    },
    setQueue: function (queueData) {
        localStorage.setItem(this.localStorageKey, JSON.stringify(queueData));
    },
    clearQueue: function () {
        localStorage.setItem(this.localStorageKey, JSON.stringify([]));
    },
    queueItemExists: function(queueData, queueId) {
        for (var i = 0; i < queueData.length; i++) {
            if(queueData[i].queueId == queueId) {
                return i;
            }
        };
        return -1;
    },
    sendQueue: function () {
        var queueData = this.getQueue();
        for (var i = 0; i < queueData.length; i++) {
            var myObjectType = Parse.Object.extend(queueData[i].type);
            // if object has a parse data id, update existing object
            if (queueData[i].id) {
                this.reprocess.byId(myObjectType, queueData[i]);
            }
            // if object has no id but a unique identifier, look for existing object, update or create new
            else if (queueData[i].hash) {
                this.reprocess.byHash(myObjectType, queueData[i]);
            }
            // else create a new object
            else {
                this.reprocess.create(myObjectType, queueData[i]);
            }
        }
        // empty queue - 2do: verify queue has been sent
        // this.clearQueue();
    },
    sendQueueCallback: function (myObject, queueObject) {
        switch (queueObject.action) {
            case 'save':
                // queued update was overwritten by other request > do not save 
                if (typeof myObject.updatedAt != 'undefined' && myObject.updatedAt > new Date(queueObject.createdAt)) {
                    return false;
                }
                myObject.save(queueObject.data, {
                    success: function (object) {
                        console.log(object);
                    },
                    error: function (model, error) {
                        console.log(error);
                    }
                });
                break;
            case 'delete':
                // 2do: code to delete queued objects
                break;
        }
    },
    reprocess: {
        create: function (myObjectType, queueObject) {
            var myObject = new myObjectType();
            Parse.LocalStorage.sendQueueCallback(myObject, queueObject);
        },
        byId: function (myObjectType, queueObject) {
            var query = new Parse.Query(myObjectType);
            query.get(queueObject.id, {
                success: function (myObject) {
                    // The object was retrieved successfully.
                    Parse.LocalStorage.sendQueueCallback(myObject, queueObject);
                },
                error: function (myObject, error) {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and description.
                }
            });
        },
        byHash: function (myObjectType, queueObject) {
            var query = new Parse.Query(myObjectType);
            query.equalTo("hash", queueObject.hash);
            query.find({
                success: function (results) {
                    // The object was retrieved successfully.
                    if(results.length > 0) {
                        Parse.LocalStorage.sendQueueCallback(results[0], queueObject);    
                    } 
                    // The object was not found, create a new one
                    else {
                        Parse.LocalStorage.reprocess.create(myObjectType, queueObject);    
                    }
                },
                error: function (myObject, error) {
                    // The object was not retrieved successfully.
                    // error is a Parse.Error with an error code and description.
                }
            });
        }
    }
};