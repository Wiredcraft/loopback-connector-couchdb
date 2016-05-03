'use strict';

/*!
 * Module dependencies
 */
var debug = require('debug')('loopback:connector:couchdb');

var url = require('url');
var nano = require('nano');
var util = require('util');
var Connector = require('loopback-connector').Connector;
var httpError = require('http-errors');
var Promise = require('bluebird');

/*!
 * Generate the CouchDB URL from the options
 */
function generateCouchDBURL(options) {
  options.hostname = (options.hostname || options.host || '127.0.0.1');
  options.protocol = options.protocol || 'http';
  options.port = (options.port || 5984);

  return options.protocol + '://' + options.hostname + ':' + options.port;
}

/**
 * Initialize the connector against the given data asource
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
  var settings = dataSource.settings;

  dataSource.connector = new CouchDB(settings, dataSource);

  // Though not mentioned, `dataSource.setup()` assumes it's connected when `initialize()` is done.
  debug('Initialize and connect');
  dataSource.connector.connect(callback);
};

/**
 * The constructor for CouchDB connector
 *
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
function CouchDB(settings, dataSource) {
  Connector.call(this, 'couchdb', settings);

  settings.url = settings.url || generateCouchDBURL(settings);

  debug('Settings: %j', settings);
  this.dataSource = dataSource;
}

util.inherits(CouchDB, Connector);

/**
 * Connect to CouchDB
 *
 * @param {Function} [callback] The callback function
 */
CouchDB.prototype.connect = function(callback) {
  if (this._connection == null) {
    // Don't parse URL.
    // @see https://github.com/dscape/nano#configuration
    var settings = Object.assign({}, this.settings, {
      parseUrl: false
    });
    settings.database = settings.database || settings.db;
    if (!settings.database) {
      throw new Error('Database name must be specified in dataSource for CouchDB connector');
    }
    var _nano = nano(this.settings);
    this._nano = Promise.resolve(Promise.promisifyAll(_nano)).bind(this);
    this._db = Promise.resolve(Promise.promisifyAll(_nano.db)).bind(this);
    this._connection = this._nano.call('use', settings.database).then(Promise.promisifyAll).bind(this);
  }
  // Callback is optional.
  return this._connection.asCallback(callback);
};

/**
 * Disconnect from CouchDB
 */
CouchDB.prototype.disconnect = function(callback) {
  if (this._connection == null) {
    // Callback is optional.
    return Promise.resolve(true).asCallback(callback);
  }
  // TODO: Disconnect.
  var promise = Promise.resolve(true);
  // Cleanup.
  this._connection = null;
  this._nano = null;
  this._db = null;
  // Callback is optional.
  return promise.asCallback(callback);
};

/**
 * Hooks.
 */

/**
 * Implement `create()`. Create an instance of Model with given data and save to the attached data
 * source.
 *
 * @see `DataAccessObject.create()`
 */
CouchDB.prototype.create = function create(modelName, data, options, callback) {
  var id = this.getIdValue(modelName, data);
  // Save id as _id.
  if (id != null) {
    data = Object.assign({}, data, { _id: id });
  }
  // Result need to be `id` and `rev`.
  return this.connect().call('insertAsync', data, options).then(function(data) {
    return [data.id, data.rev];
  }).asCallback(callback, { spread: true });
};

/**
 * Implement `save()`. Save instance.
 *
 * @see `DataAccessObject.save()`
 */
CouchDB.prototype.save = function save(modelName, data, options, callback) {
  var id = this.getIdValue(modelName, data);
  // Force PUT.
  if (options == null) {
    options = {};
  }
  if (id != null) {
    options.docName = id;
  }
  // Result is not used.
  return this.connect().call('insertAsync', data, options).asCallback(callback);
};

/**
 * Implement `destroy()`. Delete object from persistence.
 *
 * @see `DataAccessObject.remove()`
 */
CouchDB.prototype.destroy = function destroy(modelName, id, options, callback) {
  // Result is just an info.
  return this.destroyById(modelName, id, options).return({ count: 1 }).catchReturn({ count: 0 }).asCallback(callback);
};

/**
 * Implement `updateOrCreate()`. Update or insert a model instance.
 *
 * TODO: Implement
 *
 * @see `DataAccessObject.updateOrCreate()`
 */
CouchDB.prototype.updateOrCreate = function upsert(modelName, data, options, callback) {};

/**
 * TODO: Implement `findOrCreate()`?
 */

/**
 * Implement `updateAttributes()`. Update set of attributes.
 *
 * TODO: Implement
 *
 * @see `DataAccessObject.updateAttributes()`
 */
CouchDB.prototype.updateAttributes = function updateAttributes(modelName, id, data, options, callback) {};

/**
 * Implement `replaceById()`. Update set of attributes.
 *
 * TODO: Implement
 *
 * @see `DataAccessObject.replaceById()`
 */
CouchDB.prototype.replaceById = function replaceById(modelName, id, data, options, callback) {};

/**
 * Implement `replaceOrCreate()`. Update set of attributes.
 *
 * TODO: Implement
 *
 * @see `DataAccessObject.replaceOrCreate()`
 */
CouchDB.prototype.replaceOrCreate = function replaceOrCreate(modelName, data, options, callback) {};

/**
 * Hooks that do bulk operations.
 */

/**
 * Implement `all()`. Find all instances of Model that match the specified query.
 *
 * @see `DataAccessObject.find()`
 */
CouchDB.prototype.all = function all(modelName, query, options, callback) {
  // Result need to be an array.
  if (query.where == null) {
    // TODO: ?
    return Promise.resolve([]).asCallback(callback);
  }
  var keys = this.getKeysFromWhere(modelName, query.where);
  if (keys) {
    return Promise.bind(this, keys).map(function(id) {
      return this.findById(modelName, id, options).catchReturn(false);
    }).filter(Boolean).asCallback(callback);
  } else {
    // TODO: Do query
    return Promise.resolve([]).asCallback(callback);
  }
};

/**
 * Implement `update()`. Update multiple instances that match the where clause.
 *
 * @see `DataAccessObject.update()`
 * @see https://apidocs.strongloop.com/loopback/#persistedmodel-updateall
 * @deprecated This API (`updateAll`) is super confusing and most likely useless.
 */
// CouchDB.prototype.update = function update(modelName, where, data, options, callback) {};

/**
 * Implement `destroyAll()`. Destroy all matching records.
 *
 * @see `DataAccessObject.remove()`
 */
CouchDB.prototype.destroyAll = function destroyAll(modelName, where, options, callback) {
  var keys = this.getKeysFromWhere(modelName, where);
  // Result is just an info.
  if (keys) {
    return Promise.bind(this, keys).map(function(id) {
      return this.destroyById(modelName, id, options).catchReturn(false);
    }).filter(Boolean).reduce(function(info) {
      info.count++;
      return info;
    }, { count: 0 }).asCallback(callback);
  } else {
    // TODO: Do query
    return Promise.resolve({ count: 0 }).asCallback(callback);
  }
};

/**
 * Implement `count()`. Return count of matched records.
 *
 * TODO: Implement
 *
 * @see `DataAccessObject.count()`
 */
CouchDB.prototype.count = function count(modelName, where, options, callback) {};

/**
 * Helpers.
 */

/**
 * Find data from DB by Id.
 */
CouchDB.prototype.findById = function(modelName, id, options) {
  return this.connect().call('getAsync', id, options).then(function(data) {
    if (data == null) {
      return Promise.reject(httpError(404));
    }
    // .
    this.setIdValue(modelName, data, data._id);
    return data;
  });
};

/**
 * Destroy data from DB by Id.
 */
CouchDB.prototype.destroyById = function(modelName, id, options) {
  var connection = this.connect();
  return connection.call('getAsync', id, options).then(function(data) {
    if (data == null) {
      return Promise.reject(httpError(404));
    }
    return connection.call('destroyAsync', data._id, data._rev);
  });
};

/**
 * If given, get the keys from the where filter.
 *
 * @param  {String} modelName The model name
 * @param  {Object} where The where filter
 * @return {Array}
 */
CouchDB.prototype.getKeysFromWhere = function(modelName, where) {
  var key = this.getIdValue(modelName, where);
  if (key == null) {
    return [];
  }
  if (typeof key === 'string' || Buffer.isBuffer(key)) {
    return [key];
  }
  if (Array.isArray(key.inq)) {
    return key.inq;
  }
  // TODO: handle filter operators.
  return [];
};

/**
 * Get the URL that points to the connected DB.
 */
CouchDB.prototype.getDbUrl = function() {
  return this.connect().then(function(conn) {
    return urlResolveFix(conn.config.url, encodeURIComponent(conn.config.db));
  });
};

/**
 * Copied from nano.
 */
function urlResolveFix(couchUrl, dbName) {
  if (/[^\/]$/.test(couchUrl)) {
    couchUrl += '/';
  }
  return url.resolve(couchUrl, dbName);
}
