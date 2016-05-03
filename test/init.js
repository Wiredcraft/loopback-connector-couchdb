'use strict';

var Promise = require('bluebird');
var DataSource = require('loopback-datasource-juggler').DataSource;

var config = {
  host: '127.0.0.1',
  port: '5984'
};

exports.getDataSource = function(customConfig, callback) {
  var promise = new Promise(function(resolve, reject) {
    var db = new DataSource(require('../'), Object.assign({}, config, customConfig));
    db.log = function(a) {
      console.log(a);
    };
    db.on('connected', function() {
      resolve(db);
    });
    db.on('error', reject);
  });
  return promise.asCallback(callback);
};
