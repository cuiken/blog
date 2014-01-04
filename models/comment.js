/**
 * Created by ken.cui on 14-1-3.
 */
//var mongodb = require('./db');
var mongodb = require('mongodb').Db;
var settings = require('../settings');
var ObjectID = require('mongodb').ObjectID;

function Comment(pid, comment) {
    this.pid = pid;
    this.comment = comment;
}

module.exports = Comment;

Comment.prototype.save = function (callback) {
    var pid = this.pid,
        comment = this.comment;
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.update({
                "_id": new ObjectID(pid)
            }, {$push: {"comments": comment}}, function (err) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
}