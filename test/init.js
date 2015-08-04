module.exports = require('should');

var DataSource = require('loopback-datasource-juggler').DataSource;

var config = require('rc')('loopback', {
  test: {
    couchdb: {
      host: '127.0.0.1',
      port: '5984',
      dbName: 'test'
    }
  }
}).test.couchdb;

global.getDataSource = global.getSchema = function (customConfig) {
  var db = new DataSource(require('../'), customConfig || config);
  db.log = function (a) {
    console.log(a);
  };

  return db;
};
