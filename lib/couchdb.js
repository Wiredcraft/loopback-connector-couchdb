var couchdb = require('nano');
var debug = require('debug')('loopback:connector:couchdb');
var Connector = require('loopback-connector').Connector;
var util = require('util');

/*!
 * Generate the mongodb URL from the options
 */
function generateCouchDBURL(options) {
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
  s.url = s.url || generateCouchDBURL(s);
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
    self.db = db.use(self.settings.database || 'test');

    callback && callback(null, db);
  }
};

CouchDB.prototype.getTypes = function() {
  return ['db', 'nosql', 'couchdb'];
};

CouchDB.prototype.getDefaultIdType = function() {
  return String;
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
    debug('create', model, data);
  }

  var idValue = self.getIdValue(model, data);
  var idName = self.idName(model);

  if (idValue === null || idValue === undefined) {
    delete data[idName];
  } else {
    data.id = idValue;
    idName !== 'id' && delete data[idName];
  }

  self.db.insert(data, function(err, body, header) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, body.id);
  });
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

  self.db.get(id, options, function(err, data) {
    if (self.debug) {
      debug('find.callback', model, id, err, data);
    }

    console.log('find data', data);
    callback && callback(err, data);
  });
};

/**
 * Check if a model instance exists by id
 * @param {String} model The model name
 * @param {*} id The id value
 * @param {Function} callback The callback function
 */
CouchDB.prototype.exists = function(model, id, options, callback) {
  var self = this;
  if (self.debug) {
    debug('exists', model, id);
  }

  self.db.get(id, options, function(err, data) {
    if (self.debug) {
      debug('exist.callback', model, id, err, data);
    }
    callback(err, !!(!err && data));
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

  self.db.destroy(id, function(err, result) {
    callback && callback(err, result);
  });

};

/**
 * Count the number of instances for the given model
 * @param {String} model The model name
 * @param {Object} filter The filter for where
 * @param {Function} callback The callback function
 */
CouchDB.prototype.count = function count(model, where, options, callback) {
  var self = this;
  if (self.debug) {
    debug('count', model, where);
  }

};

CouchDB.prototype.ping = function ping(callback) {
  callback(null, 'pong');
};
