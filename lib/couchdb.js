'use strict';

/*!
 * Module dependencies
 */
const debug = require('debug')('loopback:connector:couchdb');

const url = require('url');
const nano = require('nano');
const httpError = require('http-errors');
const Promise = require('bluebird');
const merge = require('mixable-object').merge;

const NoSQL = require('loopback-connector-nosql');
const Accessor = NoSQL.Accessor;

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
 * The constructor for CouchDB connector
 *
 * @param {Object} settings The settings object
 * @param {DataSource} dataSource The data source instance
 * @constructor
 */
class CouchDB extends NoSQL {

  /**
   * ID type.
   */
  getDefaultIdType(prop) {
    return String;
  }

  /**
   * Connect to CouchDB
   */
  _connect(settings, database) {
    if (!database) {
      throw new Error('Database name must be specified in dataSource for CouchDB connector');
    }
    settings.url = settings.url || generateCouchDBURL(settings);
    // Don't parse URL.
    // @see https://github.com/dscape/nano#configuration
    const _nano = nano(Object.assign({}, settings, {
      parseUrl: false
    }));
    this._nano = Promise.resolve(Promise.promisifyAll(_nano)).bind(this);
    this._db = Promise.resolve(Promise.promisifyAll(_nano.db)).bind(this);
    return this._nano.call('use', database).then(Promise.promisifyAll);
  }

  /**
   * Disconnect from CouchDB
   */
  _disconnect() {
    // Cleanup.
    this._nano = null;
    this._db = null;
    return Promise.resolve(true);
  }

  /**
   * Operation hooks.
   */

  /**
   * Implement `autoupdate()`.
   *
   * @see `DataSource.prototype.autoupdate()`
   */
  autoupdate(models, callback) {
    debug('autoupdate', this.settings.database);
    let promise = this.connect().then(this.getDB).then((res) => {
      if (res) {
        return res;
      }
      return this._db.call('createAsync', this.settings.database).then(this.getDB);
    });
    // Create views.
    if (!this.settings.designDocs) {
      return promise.asCallback(callback);
    }
    return promise.then((res) => {
      return this.saveDesignDocs().return(res);
    }).asCallback(callback);
    // TODO: create views for model indexes?
    // return Promise.bind(this, models).map((modelName) => {
    //   return this._models[modelName];
    // }).filter(Boolean).map((model) => {
    // }).filter(Boolean).asCallback(callback);
  }

  /**
   * Implement `automigrate()`.
   *
   * @see `DataSource.prototype.automigrate()`
   */
  automigrate(models, callback) {
    debug('automigrate', this.settings.database);
    let promise = this.connect().then(this.getDB).then((res) => {
      if (!res) {
        return;
      }
      return this._db.call('destroyAsync', this.settings.database);
    }).then(() => {
      return this._db.call('createAsync', this.settings.database).then(this.getDB);
    });
    // Create views.
    if (!this.settings.designDocs) {
      return promise.asCallback(callback);
    }
    return promise.then((res) => {
      return this.saveDesignDocs().return(res);
    }).asCallback(callback);
    // TODO: create views for model indexes?
  }

  /**
   * Helpers.
   */

  /**
   * Get the URL that points to the connected DB.
   */
  getDbUrl() {
    return this.connect().then((conn) => {
      return urlResolveFix(conn.config.url, encodeURIComponent(conn.config.db));
    });
  }

  /**
   * Shortcut.
   */
  getDB() {
    return this._db.call('getAsync', this.settings.database).catchReturn(false);
  }

  /**
   * Shortcut.
   */
  saveDesignDocs() {
    const connection = this.connect();
    const designDocs = this.settings.designDocs;
    return Promise.bind(this, Object.keys(designDocs)).map((name) => {
      const _id = '_design/' + name;
      const options = { docName: _id };
      return connection.call('getAsync', _id).then((data) => {
        debug('updating design doc:', name);
        // Using `merge` here, to keep the things created in the other ways.
        return connection.call('insertAsync', merge.call(data, designDocs[name]), options);
      }, (err) => {
        debug('creating design doc:', name);
        return connection.call('insertAsync', designDocs[name], options);
      });
    });
  }

}

/**
 * Implement Accessor.
 */
class CouchDBAccessor extends Accessor {

  /**
   * Save data to DB without a given id.
   *
   * Result is a promise with `[id, rev]` or an error.
   */
  postWithoutId(data, options) {
    // Make sure no ID is given.
    if (data._id != null) {
      delete data._id;
    }
    return this.connection.call('insertAsync', data, options).then(function(res) {
      return [res.id, res.rev];
    });
  }

  /**
   * Save data to DB with a given id.
   *
   * Result is a promise with `[id, rev]` or an error.
   */
  postWithId(id, data, options) {
    // Force PUT.
    options = Object.assign({ docName: id }, options || {});
    // Make sure no ID is given.
    if (data._id != null) {
      delete data._id;
    }
    return this.connection.call('insertAsync', data, options).then((res) => {
      return [id, res.rev];
    });
  }

  /**
   * Save data to DB with a given id.
   *
   * Result is a promise with `[id, rev]` or an error.
   */
  putWithId(id, data, options) {
    return this.ensureRev(id, data).then((_data) => {
      return this.postWithId(id, _data, options);
    });
  }

  /**
   * Destroy data from DB by id.
   *
   * Result is a promise with whatever or an error.
   */
  destroyById(id, options) {
    return this.findById(id).then((data) => {
      return this.connection.call('destroyAsync', id, data._rev);
    }).return(true).catchReturn(false);
  }

  /**
   * Find data from DB by id.
   *
   * Result is a promise with the data or an error.
   */
  findById(id, options) {
    return this.connection.call('getAsync', id, options).then((data) => {
      if (data == null) {
        return Promise.reject(httpError(404));
      }
      return data;
    });
  }

  /**
   * Find all data from DB for a model.
   *
   * Result is a promise with an array of 0 to many `[id, data]`.
   */
  findAll(options) {
    return this.connection.call('listAsync', {
      include_docs: true
    }).get('rows').filter(function(res) {
      return !res.id.startsWith('_design');
    }).map((res) => {
      return [res.id, res.doc];
    });
  }

  /**
   * Helper.
   */
  ensureRev(id, data) {
    if (data._rev != null) {
      return Promise.resolve(data);
    }
    return this.findById(id).then((res) => {
      data._rev = res._rev;
      return data;
    });
  }

}

/**
 * Helpers.
 */

/**
 * Copied from nano.
 */
function urlResolveFix(couchUrl, dbName) {
  if (/[^\/]$/.test(couchUrl)) {
    couchUrl += '/';
  }
  return url.resolve(couchUrl, dbName);
}

// Export initializer.
exports.initialize = NoSQL.initializer('couchdb', CouchDB, CouchDBAccessor);

// Export classes.
exports.CouchDB = CouchDB;
exports.CouchDBAccessor = CouchDBAccessor;
