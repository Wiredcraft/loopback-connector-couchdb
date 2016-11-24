# loopback-connector-couchdb

[![Build Status](https://travis-ci.org/Wiredcraft/loopback-connector-couchdb.svg?branch=master)](https://travis-ci.org/Wiredcraft/loopback-connector-couchdb) [![Coverage Status](https://coveralls.io/repos/github/Wiredcraft/loopback-connector-couchdb/badge.svg?branch=master)](https://coveralls.io/github/Wiredcraft/loopback-connector-couchdb?branch=master)

## What

A connector is used to connect Loopback models to a storage, and in this case, a CouchDB DB. See the official doc for [Connecting models to data sources].

## How to

### Config

Example:

```json
// server/datasources.json
{
  "lorem": {
    "name": "cache", // the datasource name
    "connector": "couchdb", // the connector name
    "url": "${couchdbUrl}", // optional
    "database": "lorem", // required
    "designDocs": {} // optional
  }
}
```

### Install design docs

The `designDocs` that you put in the datasource config can be installed with `autoupdate()` or `automigrate()`. Example:

```json
// server/datasources.json
{
  "lorem": {
    ...
    "designDocs": {
      "find": {
        "views": {
          "byName": {
            "map": "function(doc) { if (doc.name) emit(doc.name, null); }"
          }
        }
      }
    }
  }
}
```

### Use a view

Example:

```js
// Assuming you have a connector instance.
// Note that `connect()` returns a cached connection (singleton, promisified, wrapped in a Bluebird promise).
connector.connect().call('viewAsync', 'find', 'byName', { keys: ['Charlie'] }).then((res) => {
  res.should.be.Object();
  res.should.have.property('rows').which.is.Array().with.length(1);
});
```

See the tests for more examples.

[Connecting models to data sources]: http://loopback.io/doc/en/lb2/Connecting-models-to-data-sources.html
