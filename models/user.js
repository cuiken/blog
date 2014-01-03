/**
 * Created by ken.cui on 14-1-2.
 */
var crypto = require('crypto');
//var mongodb = require('./db');
var mongodb = require('mongodb').Db;
var settings = require('../settings');

function User(user) {
    this.name = user.name;
    this.password = user.password;
    this.email = user.email;
};
module.exports = User;

User.prototype.save = function (callback) {
    var md5 = crypto.createHash('md5'),
        email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
        head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
    var user = {
        name: this.name,
        password: this.password,
        email: this.email,
        head: head
    };
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.insert(user, {
                safe: true
            }, function (err, user) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, user[0]);
            });
        });
    });
};

User.get = function (name, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if (err) {
                return callback(err);
            }
            collection.findOne({name: name}, function (err, user) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, user);
            })
        })
    })
}