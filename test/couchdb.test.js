var should = require('./init.js');

var User, db;

describe('couchdb connector', function() {

  before(function() {
    db = getDataSource();

    User = db.define('User', {
      _id: { type: Number, id: true },
      name: { type: String, index: true },
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
      User.create({_id: 3, content: 'test'}, function(err, res) {
        should.not.exist(err);
        res._id.should.be.equal('3');
        done();
      });
    });
  });

});
