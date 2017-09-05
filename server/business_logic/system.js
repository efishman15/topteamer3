var path = require('path');
var exceptions = require(path.resolve(__dirname, '../utils/exceptions'));
var generalUtils = require(path.resolve(__dirname, '../utils/general'));
var logger = require(path.resolve(__dirname, '../utils/logger'));
var async = require('async');
var sessionUtils = require(path.resolve(__dirname, './session'));
var dalDb = require(path.resolve(__dirname, '../dal/dalDb'));
var dalLeaderboads = require(path.resolve(__dirname, '../dal/dalLeaderboards'));
var cache = require(path.resolve(__dirname, '../utils/cache'));
var Leaderboard = require('agoragames-leaderboard');
var ObjectId = require('mongodb').ObjectID;

//--------------------------------------------------------------------------
// clearCache
//
// data: <NA>
//--------------------------------------------------------------------------
module.exports.clearCache = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;

  var operations = [

    //getAdminSession
    function (callback) {
      data.token = token;
      sessionUtils.getAdminSession(data, callback);
    },

    //Reload settings from database
    function (data, callback) {
      cache.clear();
      data.closeConnection = true;
      dalDb.loadSettings(data, callback);
    },

    //Inject the settings back to memory
    function (data, callback) {
      generalUtils.injectSettings(data.settings);
      logger.server.info({'user': data.session.name}, 'cache cleared!');
      callback(null, data);
    }
  ];

  async.waterfall(operations, function (err) {
    if (!err) {
      res.json(data.settings.client);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//--------------------------------------------------------------------------
// restart
//
// data: <NA>
//--------------------------------------------------------------------------
module.exports.restart = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;
  data.token = token;
  data.closeConnection = true;

  sessionUtils.getAdminSession(data, function (err, data) {

    if (err) {
      res.send(err.httpStatus, err);
      return;
    }

    res.json(generalUtils.okResponse);
    res.end();

    logger.server.info({'user': data.session.name}, 'Restarting server per admins request');

    //Forever module will take care of restarting the process again
    setTimeout(function () {
      process.exit(1);
    }, 3000);
  });
};

//--------------------------------------------------------------------------
// showLog
//
// data: <NA>
//--------------------------------------------------------------------------
module.exports.showLog = function (req, res, next) {

  var data = {token: req.params.token};

  if (!req.params.type) {
    exceptions.ServerResponseException(res, 'type not supplied', null, 'warn', 424);
    return;
  }

  if (req.params.type !== 'server' && req.params.type !== 'client') {
    exceptions.ServerResponseException(res, 'type must be server/client', null, 'warn', 424);
    return;
  }

  data.closeConnection = true;

  sessionUtils.getAdminSession(data, function (err, data) {

    if (err) {
      res.send(err.httpStatus, err);
      return;
    }

    var logFile;
    var fileName;
    if (req.params.type === 'server') {
      logFile = path.resolve(__dirname, '../logs/server.log');
      flieName = 'server.log';
    }
    else {
      logFile = path.resolve(__dirname, '../logs/client/client.log');
      flieName = 'client.log';
    }

    res.download(logFile, fileName);

  });
}

//--------------------------------------------------------------------------
// upgradeDb
//
// data: <NA>
//--------------------------------------------------------------------------
module.exports.upgradeDb = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;

  var operations = [

    //getAdminSession
    function (callback) {
      data.token = token;
      sessionUtils.getAdminSession(data, callback);
    },

    //Fix general leaderboard
    function (data, callback) {

      var options = {
        'withMemberData': true,
        'sortBy': 'rank',
        'pageSize': 1000
      };

      var usersCollection = data.DbHelper.getCollection('Users');

      var generalLeaderboard = new Leaderboard('topteamer:general');

      generalLeaderboard.leaders(0, options, function (leaders) {

        async.forEach(leaders, function (leader, callbackLeader) {

          if (/^\d+$/.test(leader.member)) {
            //this is a numeric only --> facebook user - skip
            callbackLeader();
            return;
          }

          usersCollection.findOne({
            '_id': ObjectId(leader.member)
          }, {}, function (err, user) {
            if (!err && user) {
              if (user && user.facebookUserId) {
                generalLeaderboard.removeMember(leader.member, function () {
                  generalLeaderboard.rankMember(user.facebookUserId, leader.score, user.name + '|0|' + user.facebookUserId, function () {
                    callbackLeader();
                  });

                })
              }
              else {
                //User is still a guest
                callbackLeader();
              }
            }
            else {
              //No such user
              callbackLeader();
            }
          });
        }, function() {
          callback(null, data);
        });
      });
    }
  ];

  async.waterfall(operations, function (err) {
    if (!err) {
      res.json(generalUtils.okResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
}

