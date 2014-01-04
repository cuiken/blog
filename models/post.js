/**
 * Created by ken.cui on 14-1-2.
 */
//var mongodb = require('./db'),
var markdown = require('markdown').markdown;
var ObjectID = require('mongodb').ObjectID;
var mongodb = require('mongodb').Db;
var settings = require('../settings');

function Post(name, head, title, tags, post) {
    this.name = name;
    this.head = head;
    this.title = title;
    this.tags = tags;
    this.post = post;
}

module.exports = Post;

Post.prototype.save = function (callback) {
    var date = new Date();
    var time = {
        date: date,
        year: date.getFullYear(),
        month: date.getFullYear() + "-" + (date.getMonth() + 1),
        day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    }

    var post = {
        name: this.name,
        head: this.head,
        time: time,
        title: this.title,
        tags: this.tags,
        post: this.post,
        comments: [],
        reprint_info: {},
        pv: 0
    }

    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.insert(post, {safe: true}, function (err) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
}

Post.getTen = function (name, page, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            collection.count(query, function (err, total) {
                collection.find(query, {
                    skip: (page - 1) * 10,
                    limit: 10
                }).sort({
                        time: -1
                    }).toArray(function (err, docs) {
                        db.close();
                        if (err) {
                            return callback(err);
                        }
                        docs.forEach(function (doc) {
                            doc.post = markdown.toHTML(doc.post);
                        });
                        callback(null, docs, total);
                    });
            })
        });
    });
}

Post.getOne = function (_id, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.findOne({
                "_id": new ObjectID(_id)
            }, function (err, doc) {
                if (err) {
                    return callback(err);
                }
                if (doc) {
                    collection.update({
                        "_id": new ObjectID(_id)
                    }, {
                        $inc: {"pv": 1}
                    }, function (err) {
                        db.close();
                        if (err) {
                            return callback(err);
                        }
                    });
                    doc.post = markdown.toHTML(doc.post);
                    doc.comments.forEach(function (comment) {
                        comment.content = markdown.toHTML(comment.content);
                    });
                    callback(null, doc);
                }
            });
        });
    });
}

Post.edit = function (_id, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.findOne({
                "_id": new ObjectID(_id)
            }, function (err, doc) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, doc);
            });
        });
    });
};

Post.update = function (_id, post, callback) {
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
                "_id": new ObjectID(_id)
            }, {
                $set: {post: post}
            }, function (err) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Post.remove = function (_id, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //查询要删除的文档
            collection.findOne({
                "_id": new ObjectID(_id)
            }, function (err, doc) {
                if (err) {
                    db.close();
                    return callback(err);
                }
                //如果有 reprint_from，即该文章是转载来的，先保存下来 reprint_from
                var reprint_from = "";
                if (doc.reprint_info.reprint_from) {
                    reprint_from = doc.reprint_info.reprint_from;
                }
                if (reprint_from != "") {
                    //更新原文章所在文档的 reprint_to
                    collection.update({
//                        "name": reprint_from.name,
//                        "time.day": reprint_from.day,
//                        "title": reprint_from.title
                        "_id": new ObjectID(reprint_from._id)
                    }, {
                        $pull: {
                            "reprint_info.reprint_to": {
                                "name": doc.name,
                                "day": doc.time.day,
                                "title": doc.title
                            }}
                    }, function (err) {
                        if (err) {
                            db.close();
                            return callback(err);
                        }
                    });
                }

                collection.remove({
                    "_id": new ObjectID(_id)
                }, {
                    w: 1
                }, function (err) {
                    db.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null);
                });
            });
        });
    });
}

Post.getArchive = function (callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            collection.find({}, {
                "name": 1,
                "title": 1,
                "time": 1
            }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    db.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null, docs);
                });
        });
    });
};

Post.getTags = function (callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //distinct 用来找出给定键的所有不同值
            collection.distinct("tags", function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};

Post.getTag = function (tag, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //查询所有 tags 数组内包含 tag 的文档
            //并返回只含有 name、time、title 组成的数组
            collection.find({
                "tags": tag
            }, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    db.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null, docs);
                });
        });
    });
};

Post.search = function (keyword, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var pattern = new RegExp("^.*" + keyword + ".*$", "i");
            collection.find({
                "title": pattern
            }, {
                "name": 1,
                "title": 1,
                "time": 1
            }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    db.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(null, docs);
                })
        })
    })
};

Post.reprint = function (reprint_from, reprint_to, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //找到被转载的文章的原文档
            collection.findOne({
//                "name": reprint_from.name,
//                "time.day": reprint_from.day,
//                "title": reprint_from.title
                "_id": new ObjectID(reprint_from._id)
            }, function (err, doc) {
                if (err) {
                    db.close();
                    return callback(err);
                }

                var date = new Date();
                var time = {
                    date: date,
                    year: date.getFullYear(),
                    month: date.getFullYear() + "-" + (date.getMonth() + 1),
                    day: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
                    minute: date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
                        date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
                }

                delete doc._id;//注意要删掉原来的 _id

                doc.name = reprint_to.name;
                doc.head = reprint_to.head;
                doc.time = time;
                doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : "[转载]" + doc.title;
                doc.comments = [];
                doc.reprint_info = {"reprint_from": reprint_from};
                doc.pv = 0;

                //更新被转载的原文档的 reprint_info 内的 reprint_to
                collection.update({
//                    "name": reprint_from.name,
//                    "time.day": reprint_from.day,
//                    "title": reprint_from.title
                    "_id": new ObjectID(reprint_from._id)
                }, {
                    $push: {
                        "reprint_info.reprint_to": {
                            "name": doc.name,
                            "day": time.day,
                            "title": doc.title
                        }}
                }, function (err) {
                    if (err) {
                        db.close();
                        return callback(err);
                    }
                });

                //将转载生成的副本修改后存入数据库，并返回存储后的文档
                collection.insert(doc, {
                    safe: true
                }, function (err, post) {
                    db.close();
                    if (err) {
                        return callback(err);
                    }
                    callback(err, post[0]);
                });
            });
        });
    });
};