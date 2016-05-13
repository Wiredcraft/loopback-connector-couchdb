'use strict';

var randexp = require('randexp').randexp;

var init = require('./init');

describe('CouchDB connector', function() {

  var ds;
  var connector;

  it('can connect', function(done) {
    init.getDataSource({
      database: randexp(/^[a-z]{16}$/)
    }, function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.be.Object();
      res.should.have.property('connected', true);
      res.should.have.property('connector').which.is.Object();
      ds = res;
      connector = res.connector;
      done();
    });
  });

  it('can connect', function(done) {
    connector.connect(function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.be.Object();
      res.should.have.property('info').which.is.Function();
      done();
    });
  });

  it('can disconnect', function(done) {
    ds.disconnect(done);
  });

  it('can disconnect', function(done) {
    connector.disconnect(function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.equal(true);
      done();
    });
  });

  it('can connect twice the same time', function(done) {
    connector.connect();
    connector.connect(done);
  });

  it('can disconnect twice the same time', function(done) {
    connector.disconnect();
    connector.disconnect(done);
  });

  it('can connect and disconnect', function(done) {
    connector.connect();
    connector.disconnect(done);
  });

  it('can connect', function(done) {
    connector.connect(done);
  });

});

describe('Helpers', function() {

  it('can get a URL of a DB', function(done) {
    init.getDataSource({
      database: 'lorem'
    }, function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.be.Object();
      res.should.have.property('connected', true);
      res.should.have.property('connector').which.is.Object();
      res.connector.getDbUrl().then(function(res) {
        res.should.equal('http://127.0.0.1:5984/lorem');
        done();
      }).catch(done);
    });
  });

  it('can get a URL of a DB', function(done) {
    init.getDataSource({
      database: 'lorem/ipsum'
    }, function(err, res) {
      if (err) {
        return done(err);
      }
      res.should.be.Object();
      res.should.have.property('connected', true);
      res.should.have.property('connector').which.is.Object();
      res.connector.getDbUrl().then(function(res) {
        res.should.equal('http://127.0.0.1:5984/lorem%2Fipsum');
        done();
      }).catch(done);
    });
  });

});
