var path = require('path');
var async = require('async');
var dalDb = require(path.resolve(__dirname, '../dal/dalDb'));
var dalFacebook = require(path.resolve(__dirname, '../dal/dalFacebook'));
var dalLeaderboards = require(path.resolve(__dirname, '../dal/dalLeaderboards'));
var exceptions = require(path.resolve(__dirname, '../utils/exceptions'));
var generalUtils = require(path.resolve(__dirname, '../utils/general'));
var sessionUtils = require(path.resolve(__dirname, './session'));
var commonBusinessLogic = require(path.resolve(__dirname, './common'));

//--------------------------------------------------------------------------
// private functions
//--------------------------------------------------------------------------
function getSessionResponse(session) {
  var clientSession = {
    token: session.userToken,
    userId: session.userId,
    thirdParty: {'id': session.facebookUserId}, //For older clients
    name: session.name,
    score: session.score,
    rank: session.rank,
    xpProgress: new generalUtils.XpProgress(session.xp, session.rank),
    settings: session.settings,
    features: session.features,
    avatar: commonBusinessLogic.getAvatar(session)
  };

  if (session.isAdmin) {
    clientSession.isAdmin = true;
  }

  if (session.justRegistered) {
    clientSession.justRegistered = true;
    dalLeaderboards.addScoreToGeneralLeaderboards(0, session);
  }

  if (session.gcmRegistrationId) {
    clientSession.gcmRegistrationId = session.gcmRegistrationId;
  }

  if (session.dob) {
    clientSession.dob = session.dob;
  }

  return clientSession;
}

//-----------------------------------------------------------------------------------------------------------
// connect
//
// data: user - should contain:
//          credentials (type (facebook, guest),
//            - in case of facebook: facebookInfo(userId, accessToken)
//            - in case of guest: guestInfo(uuid)
//          clientInfo (platform, appVersion (optional for apps), platformVersion (optional for apps)
//          gcmRegistrationId (optional)
//-----------------------------------------------------------------------------------------------------------
module.exports.connect = connect;
function connect(req, res, next) {
  var data = req.body;

  var clientResponse = {};

  var operations = [

    function (callback) {
      if (data.user.credentials.type === 'facebook') {
        //Validate facebook access token with facebook
        dalFacebook.getUserInfo(data, callback);
      }
      else {
        callback(null, data);
      }
    },

    //Open db connection
    function (data, callback) {
      dalDb.connect(callback);
    },

    //Try to login (or register) with the facebook info supplied
    function (connectData, callback) {
      data.DbHelper = connectData.DbHelper;
      if (data.user && data.user.clientInfo && req.headers['user-agent']) {
        data.user.clientInfo.userAgent = req.headers['user-agent'];
      }
      dalDb.login(data, callback)
    },

    //Compute features and create/update session
    function (data, callback) {
      data.features = sessionUtils.computeFeatures(data.user);
      data.closeConnection = true;
      dalDb.createOrUpdateSession(data, callback);
    },

    //Build session for client and check app version
    function (data, callback) {
      clientResponse.session = getSessionResponse(data.session);
      var serverPopup = generalUtils.checkAppVersion(data.session.clientInfo, data.session.settings.language);
      if (serverPopup) {
        clientResponse.serverPopup = serverPopup;
      }
      callback(null, data);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(clientResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//-----------------------------------------------------------------------------------------------------------
// facebookConnect
//
// data: user - should contain:
//          thirdParty (id, type, accessToken)
//          clientInfo (platform, appVersion (optional for apps), platformVersion (optional for apps)
//          gcmRegistrationId (optional)
// This is a Legacy function - for older clients - reverting to "connect" method
//-----------------------------------------------------------------------------------------------------------
module.exports.facebookConnect = function (req, res, next) {

  //Legacy - revert to "connect" method
  req.body.user.credentials = {
    type: 'facebook',
    facebookInfo: {
      userId: req.body.user.thirdParty.id,
      accessToken: req.body.user.thirdParty.accessToken
    }
  }

  connect(req, res, next);
}

//-----------------------------------------------------------------------------------------------------------
// setUser
//
// data: user - should contain:
//       avatar:string, name:string, dob:number (epoch)
//-----------------------------------------------------------------------------------------------------------
module.exports.setUser = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;

  //required fields
  if (!data.user || typeof data.user !== 'object') {
    exceptions.ServerResponseException(res, 'user object was not supplied', {}, 'error', 403);
    return;
  }

  //Required fields
  if (!data.user.avatar || !data.user.name || !data.user.dob) {
    exceptions.ServerResponseException(res, 'One of the required fields: avatar, name, dob is missing', {data: data}, 'error', 403);
    return;
  }

  var operations = [

    //Open db connection
    dalDb.connect,

    //Retrieve session
    function (connectData, callback) {
      //Retrieve the session
      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Store upgrade details in session object
    function (data, callback) {
      data.session.name = data.user.name;
      data.session.avatar = data.user.avatar;
      data.session.dob = data.user.dob;
      data.setData = {
        avatar: data.user.avatar,
        name: data.user.name,
        dob: data.user.dob
      };
      dalDb.setSession(data, callback);
    },

    //Store upgrade details in user object
    function (data, callback) {
      dalDb.setUser(data, callback);
    },

    //Sync contest avatars
    dalDb.syncContestsAvatars,

    //upgrade details in user leaderboards
    //data.contests which serves as input to this method was retrieved in previous step
    function (data, callback) {
      dalDb.closeDb(data);
      for (var i=0; i<data.contests.length; i++) {
        data.contests[i] = commonBusinessLogic.prepareContestForClient(data.contests[i],data.session);
      }
      dalLeaderboards.syncAvatars(data, callback);
    }
  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.contests);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//-----------------------------------------------------------------------------------------------------------
// upgradeGuest
//
// data: credentials - should contain:
//       credentials (type: currently must contain facebook, facebookInfo(userId, accessToken)
//-----------------------------------------------------------------------------------------------------------
module.exports.upgradeGuest = function (req, res, next) {

  var token = req.headers.authorization;
  var data = req.body;

  //No credentials
  if (!data.user || typeof data.user !== 'object' || !data.user.credentials || typeof data.user.credentials !== 'object') {
    exceptions.ServerResponseException(res, 'credentials object was not supplied', {}, 'error', 403);
    return;
  }

  //Invalid type
  if (!data.user.credentials.type || data.user.credentials.type !== 'facebook') {
    exceptions.ServerResponseException(res, 'unsupported credentials, only type=facebook is supported', {data: data}, 'error', 403);
    return;
  }

  //Invalid facebookInfo
  if (!data.user.credentials.facebookInfo || !data.user.credentials.facebookInfo.userId || !data.user.credentials.facebookInfo.accessToken) {
    exceptions.ServerResponseException(res, 'facebookInfo must include a valid access token and a userId', {data: data}, 'error', 403);
    return;
  }

  data.clientResponse = {};

  var operations = [

    //Validate facebook token
    //Open db connection
    function (callback) {
      dalFacebook.getUserInfo(data,callback)
    },

    //Open db connection
    function (data, callback) {
      dalDb.connect(callback);
    },

    //Retrieve session
    function (connectData, callback) {
      data.DbHelper = connectData.DbHelper;
      data.token = token;
      dalDb.retrieveSession(data, callback);
    },

    //Check if this facebook id already registered in our system
    function (connectData, callback) {
      data.facebookUserId = data.user.credentials.facebookInfo.userId;
      dalDb.checkIfFacebookIdExists(data, callback);
    },

    //if this facebook id already registered in our system - raise error to the client
    function (connectData, callback) {
      if (data.facebookExists) {
        dalDb.closeDb(data);
        callback(new exceptions.ServerMessageException('SERVER_ERROR_FACEBOOK_EXISTS_DO_SWITCH', {'confirm': true}));
        return;
      }
      else {
        callback(null, data);
      }
    },

    //Store upgrade details in session object
    function (data, callback) {

      data.clientResponse.name = data.user.name;

      //Update session in memory
      data.session.name = data.user.name;
      delete data.session.avatar;
      data.session.facebookUserId = data.user.credentials.facebookInfo.userId;
      data.session.facebookAccessToken = data.user.credentials.facebookInfo.accessToken;
      data.session.ageRange = data.user.ageRange;

      //Update session in db
      data.setData = {
        facebookUserId: data.user.credentials.facebookInfo.userId,
        facebookAccessToken: data.user.credentials.facebookInfo.accessToken,
        name: data.user.name,
        ageRange: data.user.ageRange
      };
      data.unsetData = {avatar: ''};
      dalDb.setSession(data, callback);
    },

    //Store upgrade details in user object
    function (data, callback) {
      data.setData = {
        facebookUserId: data.user.credentials.facebookInfo.userId,
        facebookAccessToken: data.user.credentials.facebookInfo.accessToken,
        name: data.user.name,
        email: data.user.email,
        ageRange: data.user.ageRange
      };
      data.unsetData = {avatar: ''};
      dalDb.setUser(data, callback);
    },

    //Sync contest avatars
    dalDb.syncContestsAvatars,

    //upgrade details in user leaderboards
    //data.contests which serves as input to this method was retrieved in previous step
    function (data, callback) {
      dalDb.closeDb(data);
      for (var i=0; i<data.contests.length; i++) {
        data.contests[i] = commonBusinessLogic.prepareContestForClient(data.contests[i],data.session);
      }
      data.clientResponse.contests = data.contests;
      dalLeaderboards.syncAvatars(data, callback);
    }

  ];

  async.waterfall(operations, function (err, data) {
    if (!err) {
      res.json(data.clientResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  });
};

//--------------------------------------------------------------------------
// logout
//
// data: token
//--------------------------------------------------------------------------
module.exports.logout = function (req, res, next) {
  var token = req.headers.authorization;

  var operations = [

    //Connect
    dalDb.connect,

    //Logout
    function (data, callback) {
      data.token = token;
      data.closeConnection = true;
      dalDb.logout(data, callback);
    }
  ];

  async.waterfall(operations, function (err) {
    if (!err) {
      res.json(generalUtils.okResponse);
    }
    else {
      res.send(err.httpStatus, err);
    }
  })
};
