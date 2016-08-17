'use strict';

var randexp = require('randexp').randexp;

var init = require('./init');

describe('CouchDB operations', function() {

  var ds;
  var connector;
  var Person;
  var persons;

  before(function(done) {
    init.getDataSource({
      database: randexp(/^[a-z]{16}$/),
      designDocs: {
        find: {
          views: {
            byName: {
              map: 'function(doc) { if (doc.name) emit(doc.name, null); }'
            }
          }
        }
      }
    }, function(err, res) {
      if (err) {
        return done(err);
      }
      ds = res;
      connector = ds.connector;
      Person = ds.createModel('person', {
        id: {
          type: String,
          id: true
        },
        name: String,
        age: Number
      });
      persons = [{
        id: '0',
        name: 'Charlie',
        age: 24
      }, {
        id: '1',
        name: 'Mary',
        age: 24
      }, {
        id: '2',
        name: 'David',
        age: 24
      }, {
        name: 'Jason',
        age: 44
      }];
      done();
    });
  });

  after(function(done) {
    connector._db.call('destroy', connector.settings.database, done);
  });

  it('can do autoupdate', function(done) {
    ds.autoupdate(function(err, res) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('can use the DB', function() {
    return Person.create(persons[0]).then(function(person) {
      person.id.should.equal('0');
      person.name.should.equal('Charlie');
    });
  });

  it('can use the DB', function() {
    return Person.create(persons[1]).then(function(person) {
      person.id.should.equal('1');
      person.name.should.equal('Mary');
    });
  });

  it('can use the DB', function() {
    return Person.create(persons[3]).then(function(person) {
      person.id.should.be.String();
      person.name.should.equal('Jason');
    });
  });

  it('can use the view', function() {
    return connector.connect().call('viewAsync', 'find', 'byName', { keys: ['Charlie'] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(1);
    });
  });

  it('can do autoupdate again', function(done) {
    ds.autoupdate(function(err, res) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('can use the view again', function() {
    return connector.connect().call('viewAsync', 'find', 'byName', { keys: ['Jason'] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(1);
    });
  });

  it('can have another view', function() {
    return connector.connect().call('insertAsync', {
      _id: '_design/group',
      views: {
        byAge: {
          map: 'function(doc) { if (doc.age) emit(doc.age, null); }'
        }
      }
    });
  });

  it('can use the other view', function() {
    return connector.connect().call('viewAsync', 'group', 'byAge', { keys: [24] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(2);
    });
  });

  it('can do autoupdate again', function(done) {
    ds.autoupdate(function(err, res) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('can use the view', function() {
    return connector.connect().call('viewAsync', 'find', 'byName', { keys: ['Charlie'] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(1);
    });
  });

  it('can still use the other view', function() {
    return connector.connect().call('viewAsync', 'group', 'byAge', { keys: [24] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(2);
    });
  });

  it('can remove the design docs', function() {
    var connection = connector.connect();
    return connection.call('getAsync', '_design/find').then(function(data) {
      return connection.call('destroyAsync', data._id, data._rev);
    });
  });

  it('can have another view', function() {
    return connector.connect().call('insertAsync', {
      _id: '_design/find',
      views: {
        byAge: {
          map: 'function(doc) { if (doc.age) emit(doc.age, null); }'
        }
      }
    });
  });

  it('can use the other view', function() {
    return connector.connect().call('viewAsync', 'find', 'byAge', { keys: [24] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(2);
    });
  });

  it('can do autoupdate again', function(done) {
    ds.autoupdate(function(err, res) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('can use the view', function() {
    return connector.connect().call('viewAsync', 'find', 'byName', { keys: ['Charlie'] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(1);
    });
  });

  it('can still use the other view', function() {
    return connector.connect().call('viewAsync', 'find', 'byAge', { keys: [24] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(2);
    });
  });

  it('can do automigrate', function(done) {
    ds.automigrate(function(err, res) {
      if (err) {
        return done(err);
      }
      done();
    });
  });

  it('can use the DB', function() {
    return Person.create(persons[0]).then(function(person) {
      person.id.should.equal('0');
      person.name.should.equal('Charlie');
    });
  });

  it('can use the DB', function() {
    return Person.create(persons[3]).then(function(person) {
      person.id.should.be.String();
      person.name.should.equal('Jason');
    });
  });

  it('can use the view', function() {
    return connector.connect().call('viewAsync', 'find', 'byName', { keys: ['Charlie'] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(1);
    });
  });

  it('can do automigrate before create', function(done) {
    connector._db.call('destroy', connector.settings.database, function(err) {
      if (err) {
        return done(err);
      }
      ds.automigrate(function(err, res) {
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });

  it('can use the DB', function() {
    return Person.create(persons[0]).then(function(person) {
      person.id.should.equal('0');
      person.name.should.equal('Charlie');
    });
  });

  it('can use the DB', function() {
    return Person.create(persons[3]).then(function(person) {
      person.id.should.be.String();
      person.name.should.equal('Jason');
    });
  });

  it('can use the view', function() {
    return connector.connect().call('viewAsync', 'find', 'byName', { keys: ['Charlie'] }).then(function(res) {
      res.should.be.Object();
      res.should.have.property('rows').which.is.Array().with.length(1);
    });
  });

});
