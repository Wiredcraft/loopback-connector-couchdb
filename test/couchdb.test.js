var should = require('./init.js');

var User, db;

describe('couchdb connector', function() {

  before(function() {
    db = getDataSource();

    User = db.define('User', {
      name: { type: String, index: true},
      email: { type: String, index: true, unique: true },
      age: Number
    });
  });

  beforeEach(function(done) {
    done();
  });

  describe('.ping(cb)', function() {
    it('should return true for valid connection', function(done) {
      db.ping(function(err, res) {
        (res === 'pong').should.be.true;
        done();
      });
    });
  });

  describe('.create(cb)', function() {
    it('should handle correctly type Number for id field _id', function(done) {
      User.create({name: 'myname', email: 'test@wiredcraft.com', age: 25}, function(err, res) {
        should.not.exist(err);
        res.name.should.be.equal('myname');
        done();
      });
    });
  });

});
