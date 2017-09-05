var path = require('path');
var exceptions = require(path.resolve(__dirname, '../utils/exceptions'));
var generalUtils = require(path.resolve(__dirname, '../utils/general'));
var Leaderboard = require('agoragames-leaderboard');
var logger = require(path.resolve(__dirname, '../utils/logger'));
var async = require('async');
var sessionUtils = require(path.resolve(__dirname, './session'));
var dalLeaderboards = require(path.resolve(__dirname, '../dal/dalLeaderboards'));
var dalFacebook = require(path.resolve(__dirname, '../dal/dalFacebook'));
var dalDb = require(path.resolve(__dirname, '../dal/dalDb'));

//--------------------------------------------------------------------------
// private functions
//--------------------------------------------------------------------------

//--------------------------------------------------------------------------
// getLeaders
// input: data.leaderboard
// output data.leaders
//--------------------------------------------------------------------------
function getLeaders(data, callback) {

  var operations = [

    //getSession
    function (callback) {
      data.closeConnection = true;
      sessionUtils.getSession(data, callback);
    },

    dalLeaderboards.getLeaders
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      callback(null, data);
    }
    else {
      callback(err, data);
    }
  });
}

//--------------------------------------------------------------------------
// getContestLeaders
//
// data: contestId, teamId (optional)
//--------------------------------------------------------------------------
module.exports.getContestLeaders = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;
  data.token = token;

  if (!data.contestId) {
    exceptions.ServerResponseException(res, 'contestId not supplied', null, 'warn', 424);
    return;
  }

  if (data.teamId != null && data.teamId !== 0 && data.teamId !== 1) {
    exceptions.ServerResponseException(res, 'invalid teamId supplied', {'teamId': data.teamId}, 'warn', 424);
    return;
  }

  if (data.teamId === 0 || data.teamId === 1) {
    data.leaderboard = dalLeaderboards.getTeamLeaderboard(data.contestId, data.teamId);
  }
  else {
    data.leaderboard = dalLeaderboards.getContestLeaderboard(data.contestId);
  }

  getLeaders(data, function (err, data) {
    if (!err) {
      res.json(data.leaders);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//--------------------------------------------------------------------------
// getWeeklyLeaders
//
// data: <NA>
//--------------------------------------------------------------------------
module.exports.getWeeklyLeaders = function (req, res, next) {

  var token = req.headers.authorization;
  var data = {'token': token};

  data.leaderboard = dalLeaderboards.getWeeklyLeaderboard();

  getLeaders(data, function (err, data) {
    if (!err) {
      res.json(data.leaders);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//--------------------------------------------------------------------------
// getFriends
//
// data <NA>
//--------------------------------------------------------------------------
module.exports.getFriends = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;
  data.token = token;

  var operations = [

    //getSession
    function (callback) {
      sessionUtils.getSession(data, callback);
    },

    //Retrieve friends from facebook
    function (data, callback) {

      if (!data.session.facebookUserId) {
        //Skip guests
        callback(null, data);
        return;
      }

      if (!data.session.friends) {
        data.friendsJustRetrieved = true;
        dalFacebook.getUserFriends(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Store friends retrieved from facebook in the session in memory
    function (data, callback) {
      if (!data.session.facebookUserId) {
        //Skip guests
        callback(null, data);
        return;
      }

      if (data.friendsJustRetrieved) {
        if (!data.session.friends.noPermission) {
          data.setData = {friends: data.session.friends}
          dalDb.setSession(data, callback);
        }
        else {
          callback(new exceptions.ServerMessageException('SERVER_ERROR_MISSING_FRIENDS_PERMISSION', {'confirm': true}));
          return;
        }
      }
      else {
        callback(null, data);
      }
    },

    //If synched friends - store it in the user's profile as well
    function (data, callback) {
      if (!data.session.facebookUserId) {
        //Skip guests
        callback(null, data);
        return;
      }

      if (data.friendsJustRetrieved && data.session.friends&& !data.session.friends.noPermission) {
        data.setData = {'friends': data.session.friends};
        data.closeConnection = true;
        dalDb.setUser(data, callback);
      }
      else {
        dalDb.closeDb(data);
        callback(null, data);
      }
    },

    dalLeaderboards.getFriends
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.leaders);
    }
    else {
      res.send(err.httpStatus, err);
    }
  })
};
