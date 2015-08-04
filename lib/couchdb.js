var couchdb = require('nano');
var debug = require('debug')('loopback:connector:couchdb');
var Connector = require('loopback-connector').Connector;
var util = require('util');

/*!
 * Generate the mongodb URL from the options
 */
function generateCoucnDBURL(options) {
  options.hostname = (options.hostname || options.host || '127.0.0.1');
  options.port = (options.port || 5984);

  return 'http://' + options.hostname + ':' + options.port;
}

/**
 * Initialize the connector against the given data asource
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  if (!couchdb) {
    return;
  }

  var s = dataSource.settings;

  s.safe = (s.safe !== false);
  s.w = s.w || 1;
  s.url = s.url || generateCoucnDBURL(s);
  dataSource.connector = new CouchDB(s, dataSource);

  if (callback) {
    dataSource.connector.connect(callback);
  }
};

/**
 * The constructor for CouchDB connector
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function CouchDB(settings, dataSource) {
  Connector.call(this, 'couchdb', settings);

  this.name = 'couchdb';
  this._model = {};
  this.debug = settings.debug || debug.enabled;

  if (this.debug) {
    debug('Setting: %j', settings);
  }

  this.dataSource = dataSource;

}

util.inherits(CouchDB, Connector);

/**
 * Connect to CouchDB
 * @param {Function} [callback] The callback function
 *
 * @callback callback
 * @param {Error} err The error object
 * @param {Db} db The couch DB object
 */
CouchDB.prototype.connect = function(callback) {
  var self = this;

  if (self.db) {
    process.nextTick(function () {
      callback && callback(null, self.db);
    });
  } else {
    var db = couchdb(self.settings.url);
    if (self.debug) {
      debug('CouchDB connection is established: ' + self.settings.url);
    }
    self.db = db;

    callback && callback(null, db);
  }
};

/**
 * Find a model instace by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} callback The callback function
 */
CouchDB.prototype.find = function find(model, id, options, callback) {
  if (this.debug) {
    debug('find', model, id);
  }

  this.db.get(id, function(err, result) {
    callback && callback(err, result);
  })

};

/**
 * Create a new model instance for the given data
 * @param {String} model The model name
 * @param {Object} data The model data
 * @param {Function} callback The callback function
 */
CouchDB.prototype.create = function(model, data, options, callback) {
  var self = this;
  if (self.debug) {
    debug('create', model, id);
  }

  var idValue = self.getIdValue(model, data);
  var idName = self.idName(model);

  // need better way to handle id
  // because coucdh db does not allow id to be a number
  data._id = idValue.toString();

  var db = self.db.use(self.settings.dbName);

  db.insert(data, function(err, body, header) {
    if (err) {
      callback(err);
      return;
    }

    callback && callback(null, body.id);
  });
};

/**
 * Delete a model instance by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {callback} The callback function
 */
CouchDB.prototype.destroy = function destroy(model, id, options, callback) {
  var self = this;
  if (self.debug) {
    debug('delete', model, id);
  }

  var db = self.db.use(self.settings.dbName);

  db.destroy(id, function(err, result) {
    callback && callback(err, result);
  });

};

CouchDB.prototype.ping = function(callback) {
  callback(null, 'pong');
};
