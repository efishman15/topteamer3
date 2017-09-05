var path = require('path');
var CONNECTION_STRING = 'mongodb://localhost:27017/topTeamer';
var mongoClient = require('mongodb').MongoClient;
var async = require('async');
var uuid = require('node-uuid');
var exceptions = require(path.resolve(__dirname, '../utils/exceptions'));
var ObjectId = require('mongodb').ObjectID;
var random = require(path.resolve(__dirname, '../utils/random'));
var generalUtils = require(path.resolve(__dirname, '../utils/general'));
var mathjs = require('mathjs');

//---------------------------------------------------------------------
// Cache variables
//---------------------------------------------------------------------
var topics = {};

//---------------------------------------------------------------------
// Class DbHelper
//---------------------------------------------------------------------
function DbHelper(db) {
  this.db = db;
}

//Class Methods
DbHelper.prototype.getCollection = function (collectionName) {
  return this.db.collection(collectionName);
};

DbHelper.prototype.close = function () {
  return this.db.close();
};

//---------------------------------------------------------------------
// private methods
//---------------------------------------------------------------------

//---------------------------------------------------------------------
// checkToCloseDb
//---------------------------------------------------------------------
function checkToCloseDb(data) {
  if (data && data.closeConnection) {
    closeDb(data);
  }
}

//---------------------------------------------------------------------
// buildQuestionsResult
//---------------------------------------------------------------------
function buildQuestionsResult(questions) {

  questionsResult = [];
  for (var i = 0; i < questions.length; i++) {

    var question = {
      '_id': questions[i]._id,
      'text': questions[i].text,
      'contests': questions[i].contests
    };

    questionsResult.push(question);


    questionsResult[i].answers = [];
    for (var j = 0; j < questions[i].answers.length; j++) {
      questionsResult[i].answers.push(questions[i].answers[j].text);
    }
  }

  return questionsResult;
}

//------------------------------------------------------------------------------------------------
// register
//
// Register the new user
//
// data:
// -----
// input: DbHelper, user (contains credentials (facebook: userId, accessToken, guest: uuid), name, geoInfo, settings
// output: user
//------------------------------------------------------------------------------------------------
function register(data, callback) {
  var usersCollection = data.DbHelper.getCollection('Users');

  var now = (new Date()).getTime();

  var credentials = data.user.credentials;

  data.user.settings.sound = true;
  var newUser = {
    'geoInfo': data.user.geoInfo,
    'settings': data.user.settings,
    'score': 0,
    'xp': 0,
    'rank': 1,
    'createdAt': now,
    'lastLogin': now,
    'lastClientInfo': data.user.clientInfo
  };

  if (data.user.credentials.type === 'facebook') {
    newUser.facebookUserId = data.user.credentials.facebookInfo.userId;
    newUser.facebookAccessToken = data.user.credentials.facebookInfo.accessToken
    newUser.name = data.user.name;
    newUser.email = data.user.email;  //keep sync with Facebook changes - might be null if user removed email permission
    newUser.ageRange = data.user.ageRange;
  }
  else if (data.user.credentials.type === 'guest') {
    newUser.uuid = data.user.credentials.guestInfo.uuid;
    newUser.name = generalUtils.settings.client.ui[data.user.settings.language]['GUEST_DEFAULT_NAME'];
    if (generalUtils.settings.server.guest.name.random.use) {
      var randomNumber = random.rnd(generalUtils.settings.server.guest.name.random.range.min, generalUtils.settings.server.guest.name.random.range.max);
      newUser.name += ' ' + randomNumber;
    }
    newUser.avatar = generalUtils.settings.server.guest.defaultAvatar;
  }
  else {
    callback(new exceptions.ServerException('Unsupported credentials type: ' + data.user.credentials.type + '. Supported types are: facebook, guest', {}, 'error'));
    return;
  }

  if (data.user.gcmRegistrationId) {
    newUser.gcmRegistrationId = data.user.gcmRegistrationId;
  }

  usersCollection.insert(newUser
    , {}, function (err, insertResult) {
      if (err) {

        closeDb(data);

        callback(new exceptions.ServerException('Error inserting new user', {
          'user': newUser,
          'dbError': err
        }, 'error'));
        return;
      }

      data.user = newUser;
      data.user.credentials = credentials;
      data.user.justRegistered = true; //does not need to be in db - just returned back to the client

      checkToCloseDb(data);

      callback(null, data);
    });
}

//---------------------------------------------------------------------
// closeDb
//
// Closes connection to the database
//
// data:
// -----
// input: DbHelper
// output: <NA>
//---------------------------------------------------------------------
module.exports.closeDb = closeDb;
function closeDb(data) {
  data.DbHelper.close();
  delete data.DbHelper;
}

//---------------------------------------------------------------------
// Connect
//
// Connects to the database
//
// data:
// -----
// input: <NA>
// output: DbHelper
//---------------------------------------------------------------------
module.exports.connect = connect;
function connect(callback) {
  mongoClient.connect(CONNECTION_STRING, function (err, db) {
    if (err) {
      callback(new exceptions.ServerException('Error connecting to the database', {'dbError': err}, 'error'));
      return;
    }

    callback(null, {DbHelper: new DbHelper(db)});
  })
}

//---------------------------------------------------------------------
// public methods
//---------------------------------------------------------------------

//------------------------------------------------------------------------------------------------
// loadSettings
//
// loads settings object from db
//------------------------------------------------------------------------------------------------
module.exports.loadSettings = loadSettings;
function loadSettings(data, callback) {

  if (!data || !data.DbHelper) {
    connect(function (err, connectData) {
      if (!data) {
        data = {closeConnection: true};
      }
      else {
        data.closeConnection = true;
      }
      data.DbHelper = connectData.DbHelper;
      loadSettings(data, callback);
    });
    return;
  }

  var settingsCollection = data.DbHelper.getCollection('Settings');
  settingsCollection.findOne({}, {}, function (err, settings) {
    if (err || !settings) {

      closeDb(data);

      callback(new exceptions.ServerException('Error finding contest', {
        'dbError': err
      }, 'error'));

      return;
    }

    checkToCloseDb(data);

    data.settings = settings;

    callback(null, data);
  })
};

//---------------------------------------------------------------------
// getTopic
//
// Lazy load from DB first time (for each topicId).
// Then, retrieved from memory cache - managed as has by topic Id
// data:
// -----
// input: topicId
// output: topic
//---------------------------------------------------------------------
module.exports.getTopic = function (data, callback) {
  var topic = topics['' + data.topicId];
  if (topic) {
    data.topic = topic;
    callback(null, data);
  }
  else {
    connect(function (err, connectData) {
      var topicsCollection = connectData.DbHelper.getCollection('Topics');
      topicsCollection.findOne({
        'topicId': data.topicId
      }, {}, function (err, topic) {
        if (err || !topic) {

          closeDb(connectData);

          callback(new exceptions.ServerException('Error retrieving topic by id', {
            'topicId': data.topicId,
            'dbError': err
          }, 'error'));
          return;
        }

        closeDb(connectData);

        topics['' + data.topicId] = topic;

        data.topic = topic;
        callback(null, data);
      })
    })
  }
};

//---------------------------------------------------------------------
// retrieveSession
//
// Retrieves a session from the db based on token
//
// data:
// -----
// input: DbHelper (optional), token
// output: session
//---------------------------------------------------------------------
module.exports.retrieveSession = retrieveSession;
function retrieveSession(data, callback) {

  var criteria;
  if (data.token) {
    criteria = {'userToken': data.token}
  }
  else if (data.userId) {
    criteria = {'userId': ObjectId(data.userId)}
  }
  else if (data.facebookUserId) {
    criteria = {'facebookUserId': data.facebookUserId}
  }
  else {
    callback(new exceptions.ServerException('Error retrieving session - no session identifier was supplied', null, 'info', 401));
    return;
  }

  //If no connection open - call recursively to this function from within the 'connect' block
  if (!data.DbHelper) {
    connect(function (err, connectData) {

      data.closeConnection = true; //Indicates to close the connection after the action
      data.DbHelper = connectData.DbHelper;
      retrieveSession(data, callback);
    });
    return;
  }

  var sessionsCollection = data.DbHelper.getCollection('Sessions');

  sessionsCollection.findOne(
    criteria, {},
    function (err, session) {
      if (!data.sessionOptional && (err || !session)) {

        closeDb(data);

        //Serverity 'low' does not exist - thus skipping writing to logs and console
        callback(new exceptions.ServerException('Error retrieving session - session expired', {'sessionId': data.token}, 'info', 401));
        return;
      }

      data.session = session;

      checkToCloseDb(data);

      callback(null, data);
    }
  )
}

module.exports.retrieveAdminSession = retrieveAdminSession;
function retrieveAdminSession(data, callback) {

  retrieveSession(data, function (err, data) {
    if (err) {
      closeDb(data);
      callback(err);
      return;
    }

    if (!data.session.isAdmin) {
      closeDb(data);
      callback(new exceptions.ServerException('This action is permitted for admins only', {'sessionId': data.token}, 'error', 403));
      return;
    }

    callback(null, data);
  })
}

//---------------------------------------------------------------------
// setUser
//
// Saves specific data into the user's object in db
//
// data:
// -----
// input: DbHelper, session, setData (properties and their values to set)
// output: <NA>
//---------------------------------------------------------------------
module.exports.setUser = function (data, callback) {

  if (!data.setData && !data.unsetData) {
    callback(new exceptions.ServerException('Cannot update user, either setData or unsetData must be supplied', {
      'setData': data.setData,
      'unsetData': data.unsetData,
      'dbError': err
    }, 'error'));
  }

  var usersCollection = data.DbHelper.getCollection('Users');

  if (!data.setUserWhereClause) {
    data.setUserWhereClause = {'_id': ObjectId(data.session.userId)};
  }

  var updateClause = {};
  if (data.setData) {
    updateClause['$set'] = data.setData;
  }
  if (data.unsetData) {
    updateClause['$unset'] = data.unsetData;
  }

  usersCollection.updateOne(data.setUserWhereClause, updateClause,
    function (err, results) {

      if (err || results.nModified < 1) {

        closeDb(data);

        callback(new exceptions.ServerException('Error updating user', {
          'setUserWhereClause': data.setUserWhereClause,
          'setData': data.setData,
          'unsetData': data.unsetData,
          'dbError': err
        }, 'error'));

        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    });
};

//---------------------------------------------------------------------
// setSession
//
// Saves specific data into the session's object in db
//
// data:
// -----
// input: DbHelper, session, setData (properties and their values to set)
// output: <NA>
//---------------------------------------------------------------------
module.exports.setSession = function (data, callback) {

  if (!data.setData && !data.unsetData) {
    callback(new exceptions.ServerException('Cannot update session, either setData or unsetData must be supplied', {
      'setData': data.setData,
      'unsetData': data.unsetData,
      'dbError': err
    }, 'error'));
  }

  var sessionsCollection = data.DbHelper.getCollection('Sessions');

  var updateClause = {};
  if (data.setData) {
    updateClause['$set'] = data.setData;
  }
  if (data.unsetData) {
    updateClause['$unset'] = data.unsetData;
  }

  sessionsCollection.updateOne({'_id': ObjectId(data.session._id)}, updateClause,
    function (err, results) {

      if (err || results.nModified < 1) {

        closeDb(data);

        callback(new exceptions.ServerException('Error updating session', {
          'id': data.session._id.toString(),
          'setData': data.setData,
          'unsetData': data.unsetData,
          'dbError': err
        }, 'error'));

        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    });
};


//---------------------------------------------------------------------
// login
//
// Validates that the credentials id exists, and updates the lastLogin.
// If user does not exist - register the new user
//
// data:
// -----
// input: DbHelper, user (contains credentials
// output: user
//---------------------------------------------------------------------
module.exports.login = function (data, callback) {

  var usersCollection = data.DbHelper.getCollection('Users');

  var clientInfo = data.user.clientInfo;
  var credentials = data.user.credentials;
  var whereClause;

  if (data.user.credentials.type === 'facebook') {
    whereClause = {facebookUserId: data.user.credentials.facebookInfo.userId};
  }
  else if (data.user.credentials.type === 'guest') {
    whereClause = {uuid: data.user.credentials.guestInfo.uuid};
  }
  else {
    callback(new exceptions.ServerException('Unsupported credentials type: ' + data.user.credentials.type + ', supported types: facebook, guest', {
      'user': data.user
    }, 'error'));
    return;
  }

  usersCollection.findOne(whereClause, {}, function (err, user) {
      if (err || !user) {
        register(data, callback);
        return;
      }

      var prevLogin = new Date(user.lastLogin);

      var today = new Date();
      var now = today.getTime();

      if (prevLogin.getUTCDay() != today.getUTCDay() ||
        prevLogin.getUTCMonth() != today.getUTCMonth() ||
        prevLogin.getUTCFullYear() != today.getUTCFullYear()) {

        var xpProgress = new generalUtils.XpProgress(user.xp, user.rank);
        xpProgress.addXp(user, 'login');
      }

      var setObject = {
        '$set': {
          'lastLogin': now,
          'ageRange': data.user.ageRange, //keep sync with Facebook changes
          'xp': user.xp,
          'rank': user.rank,
          'lastClientInfo': data.user.clientInfo
        }
      };

      if (data.user.credentials.type === 'facebook') {
        setObject['$set'].facebookAccessToken = data.user.credentials.facebookInfo.accessToken;
        setObject['$set'].name = data.user.name;  //keep sync with Facebook changes
        setObject['$set'].email = data.user.email;  //keep sync with Facebook changes - might be null if user removed email permission
        setObject['$set'].ageRange = data.user.ageRange;  //keep sync with Facebook changes
      }

      if (data.user.gcmRegistrationId) {
        setObject['$set'].gcmRegistrationId = data.user.gcmRegistrationId;
      }

      usersCollection.updateOne({'_id': user._id}, setObject
        , function (err, results) {
          if (err || results.nModified < 1) {

            closeDb(data);

            callback(new exceptions.ServerException('Error updating user during login', {
              'user': user
            }, 'error'));

            return;
          }

          //Update all those fields also locally as previously they were only updated in the db
          user.lastLogin = now;

          if (data.user.credentials.type === 'facebook') {
            user.name = data.user.name;
            user.email = data.user.email;
            user.ageRange = data.user.ageRange;
          }

          user.credentials = credentials;
          user.lastClientInfo = clientInfo;
          data.user = user;

          checkToCloseDb(data);

          callback(null, data);
        });
    }
  );
};

//---------------------------------------------------------------------
// createOrUpdateSession
//
// Creates a new session for a user,
// or updates and existing one (extending the session)
//
//
// data:
// -----
// input: DbHelper, user
// output: <NA>
//---------------------------------------------------------------------
module.exports.createOrUpdateSession = function (data, callback) {

  var userToken = uuid.v1();
  var sessionsCollection = data.DbHelper.getCollection('Sessions');

  var now = new Date();
  var nowEpoch = now.getTime();

  var setObject = {
    'userId': ObjectId(data.user._id),
    'isAdmin': data.user.isAdmin,
    'name': data.user.name,
    'created': nowEpoch,
    'expires': new Date(nowEpoch + generalUtils.settings.server.db.sessionExpirationMilliseconds), //must be without getTime() since db internally removes by TTL - and ttl works only when it is actual date and not epoch
    'userToken': userToken,
    'settings': data.user.settings,
    'score': data.user.score,
    'xp': data.user.xp,
    'rank': data.user.rank,
    'features': data.features,
    'clientInfo': data.user.lastClientInfo
  };

  if (data.user.credentials.type === 'facebook') {
    setObject.facebookAccessToken = data.user.facebookAccessToken;
    setObject.facebookUserId = data.user.facebookUserId;
    setObject.ageRange = data.user.ageRange;
  }
  else if (data.user.credentials.type === 'guest') {
    setObject.avatar = data.user.avatar;
    if (data.user.dob) {
      setObject.dob = data.user.dob;
    }
  }

  if (data.user.justRegistered) {
    setObject.justRegistered = true;
  }

  if (data.user.gcmRegistrationId) {
    setObject.gcmRegistrationId = data.user.gcmRegistrationId
  }

  sessionsCollection.findAndModify({'userId': ObjectId(data.user._id)}, {},
    {
      $set: setObject,
    }, {upsert: true, new: true}, function (err, session) {

      if (err) {

        closeDb(data);

        callback(new exceptions.ServerException('Error finding/creating session', {
          'userId': data.user._id,
          'dbError': err
        }, 'error'));
        return;
      }

      data.session = session.value;

      //Write to session history
      var sessionsHistoryCollection = data.DbHelper.getCollection('SessionHistory');
      var sessionHistoryRecord = JSON.parse(JSON.stringify(data.session));
      sessionHistoryRecord.sessionId = sessionHistoryRecord._id;
      delete sessionHistoryRecord._id;

      sessionsHistoryCollection.insert(sessionHistoryRecord
        , {}, function (sessionHistoryError, insertResult) {
          if (sessionHistoryError) {

            closeDb(data);

            callback(new exceptions.ServerException('Error inserting session history record', {
              'session': data.session,
              'dbError': sessionHistoryError
            }, 'error'));
            return;
          }

          checkToCloseDb(data);
          callback(null, data);

        });
    })
};


//---------------------------------------------------------------------
// logout
// removes the user's session (if exist)
//
// data:
// -----
// input: DbHelper, token
// output: <NA>
//---------------------------------------------------------------------
module.exports.logout = function (data, callback) {
  var sessionsCollection = data.DbHelper.getCollection('Sessions');

  //Actual logout - remove the session
  sessionsCollection.remove(
    {
      'userToken': data.token
    }
    , {w: 1, single: true},
    function (err, numberOfRemovedDocs) {
      if (err || numberOfRemovedDocs.ok == 0) {

        //Session does not exist - probably expired - not an error
        closeDb(data);
        callback(null, data);
        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    }
  );
};

//---------------------------------------------------------------------
// logAction
// logs the action to the db (for statistics)
//
// data:
// -----
// input: DbHelper, session, action, actionData (optional)
// output: <NA>
//---------------------------------------------------------------------
module.exports.logAction = logAction;
function logAction(data, callback) {

  var logCollection = data.DbHelper.getCollection('Log');

  data.logAction.date = (new Date()).getTime();

  logCollection.insert(data.logAction
    , {}, function (err, insertResult) {
      if (err) {

        closeDb(data);

        callback(new exceptions.ServerException('Error inserting record to log', {
          'action': data.logAction,
          'dbError': err
        }, 'error'));
        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    })
};

//---------------------------------------------------------------------
// prepareQuestionCriteria
//
// data:
// -----
// input: DbHelper, session
// output: questionCriteria
//---------------------------------------------------------------------
module.exports.prepareQuestionCriteria = prepareQuestionCriteria;
function prepareQuestionCriteria(data, callback) {

  var questionCriteria;

  data.session.quiz.clientData.currentQuestionIndex++;

  if (!data.session.quiz.serverData.userQuestions) {

    //System generated questions
    var questionLevel = generalUtils.settings.server.quiz.questions.systemTrivia.levels[data.session.quiz.clientData.currentQuestionIndex];

    questionCriteria = {
      '$and': [
        {'_id': {'$nin': data.session.quiz.serverData.previousQuestions}},
        {'topicId': {'$in': generalUtils.settings.server.triviaTopicsPerLanguage[data.session.settings.language]}},
        {
          '$or': [
            {'correctAnswers': 0, 'wrongAnswers': 0},
            {
              '$and': [
                {'correctRatio': {$gte: questionLevel.minCorrectRatio}},
                {'correctRatio': {$lt: questionLevel.maxCorrectRatio}}
              ]
            }]
        }
      ]
    };

    //Filter by age if available
    if (data.session.ageRange) {
      if (data.session.ageRange.min) {
        questionCriteria['$and'].push({'minAge': {$lte: data.session.ageRange.min}});
      }

      if (data.session.ageRange.max) {
        questionCriteria['$and'].push({'maxAge': {$gte: data.session.ageRange.max}});
      }
    }
  }
  else {
    //User questions - get the exact current question in the quiz
    questionCriteria = {'_id': ObjectId(data.session.quiz.serverData.userQuestions[data.session.quiz.clientData.currentQuestionIndex])}
  }
  data.questionCriteria = questionCriteria;

  callback(null, data);
};

//---------------------------------------------------------------------
// getQuestionsCount
//
// Count questions collection in the prepared question criteria
//
// data:
// -----
// input: DbHelper, session, questionCriteria
// output: questionsCount
//---------------------------------------------------------------------
module.exports.getQuestionsCount = getQuestionsCount;
function getQuestionsCount(data, callback) {
  var questionsCollection = data.DbHelper.getCollection('Questions');
  questionsCollection.count(data.questionCriteria, function (err, count) {
    if (err || count === 0) {
      closeDb(data);
      callback(new exceptions.ServerException('Error retrieving number of questions from the database', {
        'count': count,
        'questionCriteria': data.questionCriteria,
        'dbError': err
      }, 'error'));
      return;
    }

    checkToCloseDb(data);

    data.questionsCount = count;

    callback(null, data);
  })
};

//----------------------------------------------------------------------------------------------------------
// getNextQuestion
//
// Get the next question
//
// data:
// -----
// input: DbHelper, session, questionCriteria, questionsCount (optional if contest has user questions)
// output: question
//----------------------------------------------------------------------------------------------------------
module.exports.getNextQuestion = getNextQuestion;
function getNextQuestion(data, callback) {
  var skip

  if (!data.session.quiz.serverData.userQuestions) {
    skip = random.rnd(0, data.questionsCount - 1);
  }
  else {
    skip = 0;
  }

  var questionsCollection = data.DbHelper.getCollection('Questions');
  questionsCollection.findOne(data.questionCriteria, {skip: skip}, function (err, question) {
    if (err || !question) {
      closeDb(data);
      callback(new exceptions.ServerException('Error retrieving next question from database', {
        'questionsCount': data.questionsCount,
        'questionCriteria': data.questionCriteria,
        'skip': skip,
        'dbError': err
      }, 'error'));
      return;
    }

    checkToCloseDb(data);

    callback(null, question);
  })
};

//------------------------------------------------------------------------------------------------
// addContest
//
// add a new Contest
//
// data:
// -----
// input: DbHelper, session, contest
// output: contest (including the new _id got from db)
//------------------------------------------------------------------------------------------------
module.exports.addContest = addContest;
function addContest(data, callback) {
  var contestsCollection = data.DbHelper.getCollection('Contests');

  contestsCollection.insert(data.contest
    , {}, function (err, insertResult) {

      if (err) {

        closeDb(data);

        callback(new exceptions.ServerException('Error adding contest', {
          'contest': data.contest,
          'dbError': err
        }, 'error'));
        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    });
}

//------------------------------------------------------------------------------------------------
// setContest
//
// updates the Contest
//
// data:
// -----
// input: DbHelper, session, contest, checkOwner
// output: contest (most updated object in db)
//------------------------------------------------------------------------------------------------
module.exports.setContest = setContest;
function setContest(data, callback) {
  var contestsCollection = data.DbHelper.getCollection('Contests');

  var whereClause = {'_id': ObjectId(data.contest._id)};

  //Only contest owners or admins can update the contest
  if (data.checkOwner && !data.session.isAdmin) {
    whereClause['creator.id'] = ObjectId(data.session.userId);
    whereClause['endDate'] = {$gt: (new Date()).getTime()}; //Non admin owner can't update a finished contest
  }

  var updateFields = {$set: data.setData};
  if (data.incData) {
    updateFields['$inc'] = data.incData;
  }
  if (data.unsetData) {
    updateFields['$unset'] = data.unsetData;
  }
  contestsCollection.findAndModify(whereClause, {},
    updateFields, {w: 1, new: true}, function (err, contest) {

      if (err || !contest || !contest.value) {
        closeDb(data);

        callback(new exceptions.ServerException('Error setting contest', {
          'whereClause': whereClause,
          'updateFields': updateFields,
          'contestId': data.contestId,
          'dbError': err
        }, 'error'));
        return;
      }

      data.contest = contest.value; //refreshes the latest state object from db

      checkToCloseDb(data);

      callback(null, data);
    });
}

//------------------------------------------------------------------------------------------------
// removeContest
//
// Remove the contest
//
// data:
// -----
// input: DbHelper, session, contestId
// output: <NA>
//------------------------------------------------------------------------------------------------
module.exports.removeContest = removeContest;
function removeContest(data, callback) {

  var contestsCollection = data.DbHelper.getCollection('Contests');
  contestsCollection.remove(
    {
      '_id': ObjectId(data.contestId)
    }
    , {w: 1, single: true},
    function (err, numberOfRemovedDocs) {
      if (err || numberOfRemovedDocs.ok === 0) {

        //Contest does not exist - stop the call chain
        closeDb(data);

        callback(new exceptions.ServerException('Error removing contest', {
          'contestId': data.contestId,
          'dbError': err
        }, 'error'));
        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    });
}

//------------------------------------------------------------------------------------------------
// getContest
//
// Get a contest by id
// //
// data:
// -----
// input: DbHelper, session, contestId
// output: contest
//------------------------------------------------------------------------------------------------
module.exports.getContest = getContest;
function getContest(data, callback) {

  var contestsCollection = data.DbHelper.getCollection('Contests');
  contestsCollection.findOne({
    '_id': ObjectId(data.contestId)
  }, {}, function (err, contest) {
    if (err || !contest) {

      closeDb(data);

      callback(new exceptions.ServerException('Error finding contest', {
        'contestId': data.contestId,
        'dbError': err
      }, 'error'));

      return;
    }

    checkToCloseDb(data);

    data.contest = contest;

    callback(null, data);
  })
}

//---------------------------------------------------------------------
// prepareContestsQuery
//
// data:
// -----
// input: DbHelper, session, tab
// output: contestsCriteria
//---------------------------------------------------------------------
module.exports.prepareContestsQuery = prepareContestsQuery;
function prepareContestsQuery(data, callback) {

  data.contestQuery = [];
  var whereClause = {'$match': {'language': data.session.settings.language}}
  var limitClause;
  var sortClause = {'$sort': {}};

  var clientFields;
  if (!data.session.isAdmin) {
    clientFields = generalUtils.arrayToObject(generalUtils.settings.server.contest.list.clientFields, 1);
  }
  else {
    clientFields = generalUtils.arrayToObject(generalUtils.settings.server.contest.list.adminClientFields, 1);
  }

  //Will return the user's team if joined to a team or null if not
  clientFields.myTeam = {$cond: [{$eq: ['$users.' + data.session.userId + '.userId', ObjectId(data.session.userId)]}, '$users.' + data.session.userId + '.team', -1]};

  //Will return true if current user is the owner of the contest or null otherwise
  clientFields.owner = {$cond: [{$eq: ['$creator.id', ObjectId(data.session.userId)]}, true, false]};

  //Will return the total participants including the "system participants"
  clientFields['participants'] = {$add: ['$participants', '$systemParticipants']};

  var fieldsClause = {'$project': clientFields};

  var now = (new Date()).getTime();

  switch (data.tab) {
    case 'mine':
      whereClause['$match'].endDate = {$gte: now}; //not finished yet
      whereClause['$match']['users.' + data.session.userId] = {$exists: true};
      sortClause['$sort'].rating = -1; //descending
      sortClause['$sort'].participants = -1; //descending
      sortClause['$sort'].startDate = 1; //ascending
      break;

    case 'running':
      whereClause['$match'].endDate = {$gte: now}; //not finished yet
      limitClause = {'$limit': generalUtils.settings.server.contest.list.pageSize};
      sortClause['$sort'].rating = -1; //descending
      sortClause['$sort'].participants = -1; //descending
      sortClause['$sort'].startDate = 1; //ascending
      break;

    case 'recentlyFinished':
      //Finished between now and X days ago as set in settings
      whereClause['$match'].endDate = {
        $lt: now,
        $gte: now - (generalUtils.settings.server.contest.list.recentlyFinishedDays * 24 * 60 * 60 * 1000)
      };
      limitClause = {'$limit': generalUtils.settings.server.contest.list.pageSize};
      sortClause['$sort'].endDate = -1; //descending
      break;

    default:
      closeDb(data);
      callback(new exceptions.ServerException('Error getting contests - tab invalid or not supplied', {
        'tab': data.tab
      }, 'error'));
      return;
  }

  data.contestQuery.push(whereClause);
  data.contestQuery.push(fieldsClause);
  data.contestQuery.push(sortClause);
  if (limitClause) {
    data.contestQuery.push(limitClause);
  }

  callback(null, data);
}

//------------------------------------------------------------------------------------------------
// getContests
//
// Get all contests.
//
// data:
// -----
// input: DbHelper, session, contestQuery
// output: <NA>
//------------------------------------------------------------------------------------------------
module.exports.getContests = getContests;
function getContests(data, callback) {
  var contestsCollection = data.DbHelper.getCollection('Contests');
  contestsCollection.aggregate(data.contestQuery,
    function (err, contests) {
      if (err || !contests) {

        closeDb(data);
        callback(new exceptions.ServerException('Error retrieving contests', {
          'contestQuery': data.contestQuery,
          'dbError': err
        }, 'error'));

        return;
      }

      checkToCloseDb(data);

      data.contests = contests;

      callback(null, data);

    });
}
//------------------------------------------------------------------------------------------------
// updateQuestionStatistics
//
// Update questions statistics (correctAnswers, wrongAnswers, correctRatio)
//
// data:
// -----
// input: id (answerId 1 based - e.g. 1,2,3,4), DbHelper, session, response.question.correct
// output: <NA>
//------------------------------------------------------------------------------------------------
module.exports.updateQuestionStatistics = updateQuestionStatistics;
function updateQuestionStatistics(data, callback) {

  var questionsCollection = data.DbHelper.getCollection('Questions');
  questionsCollection.findOne({
    '_id': ObjectId(data.session.quiz.serverData.currentQuestion._id)
  }, {}, function (err, question) {

    if (err || !question) {

      closeDb(data);

      callback(new exceptions.ServerException('Error finding question to update statistics', {
        'questionId': data.session.quiz.serverData.currentQuestion._id,
        'id': data.id,
        'dbError': err
      }, 'error'));
      return;
    }

    var correctAnswers = question.correctAnswers;
    var wrongAnswers = question.wrongAnswers;
    if (data.clientResponse.question.correct) {
      correctAnswers++;
    }
    else {
      wrongAnswers++;
    }
    var correctRatio = correctAnswers / (correctAnswers + wrongAnswers);

    var answered;
    var answerRatio;
    if (!question.answers[data.id].answered) {
      answered = 0;
    }
    else {
      answered = question.answers[data.id].answered;
    }
    answered++;
    answerRatio = answered / (correctAnswers + wrongAnswers);

    var setClause = {};
    setClause.correctAnswers = correctAnswers;
    setClause.wrongAnswers = wrongAnswers;
    setClause.correctRatio = correctRatio;
    setClause['answers.' + data.id + '.answered'] = answered;
    setClause['answers.' + data.id + '.answerRatio'] = answerRatio;

    questionsCollection.updateOne({'_id': ObjectId(data.session.quiz.serverData.currentQuestion._id)},
      {
        $set: setClause
      }, function (err, results) {

        if (err || results.nModified < 1) {

          closeDb(data);

          callback(new exceptions.ServerException('Error updating question statistics', {
            'quesitonId': data.session.quiz.serverData.currentQuestion._id,
            'updateResults': results,
            'dbError': err
          }, 'error'));

          return;
        }

        checkToCloseDb(data);

        callback(null, data);
      });

  })
}

//--------------------------------------------------------------------------------------------------------------
// insertPurchase
//
// Inserts a new purchase record - duplicates are catched and switches data.duplicatePurchase to true
//
// data:
// -----
// input: DbHelper, newPurchase
// output: possibly duplicatePurchase=true
//--------------------------------------------------------------------------------------------------------------
module.exports.insertPurchase = insertPurchase;
function insertPurchase(data, callback) {

  if (!data.DbHelper) {

    connect(function (err, connectData) {

      data.DbHelper = connectData.DbHelper;
      data.closeConnection = true;

      insertPurchase(data, callback);
    });
    return;
  }

  var purchasesCollection = data.DbHelper.getCollection('Purchases');

  data.newPurchase.created = (new Date()).getTime();

  purchasesCollection.insert(data.newPurchase
    , {}, function (err, insertResult) {
      if (err) {
        if (err.code !== 11000) {

          closeDb(data);

          callback(new exceptions.ServerException('Error inserting purchase record', {
            'purchaseRecord': data.newPurchase,
            'dbError': err
          }, 'error'));

          return;
        }
        else {
          data.duplicatePurchase = true;
        }
      }

      checkToCloseDb(data);

      callback(null, data);
    });
}

//--------------------------------------------------------------------------------------------------------------
// insertQuestion
//
// Inserts a new question record
//
// data:
// -----
// input: DbHelper, newQuestion, session, contest
// output: possibly duplicatePurchase=true
//--------------------------------------------------------------------------------------------------------------
module.exports.insertQuestion = insertQuestion;
function insertQuestion(data, callback) {

  var questionsCollection = data.DbHelper.getCollection('Questions');

  data.newQuestion.created = (new Date()).getTime();
  data.newQuestion.userIdCreated = data.session.userId;
  data.newQuestion.minAge = 0;
  data.newQuestion.maxAge = 120;
  data.newQuestion.correctAnswers = 0;
  data.newQuestion.wrongAnswers = 0;
  data.newQuestion.correctRatio = 0;

  //Associate the question with a contest - if an existing contest in db (contest edit mode)
  if (data.contest && data.contest._id) {
    data.newQuestion.contests = {};
    data.newQuestion.contests[data.contest._id] = true;
  }

  questionsCollection.insert(data.newQuestion
    , {}, function (err, insertResult) {
      if (err) {

        closeDb(data);

        callback(new exceptions.ServerException('Error inserting question record', {
          'questionRecord': data.newQuestion,
          'dbError': err
        }, 'error'));

        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    });
}

//---------------------------------------------------------------------
// setQuestion
//
// Saves specific data into the questions's object in db
//
// data:
// -----
// input: DbHelper, session, questionId, setData (properties and their values to set)
// output: <NA>
//---------------------------------------------------------------------
module.exports.setQuestion = function (data, callback) {

  if (!data.setData && !data.unsetData) {
    callback(new exceptions.ServerException('Cannot update question, setData or unsetData must be supplied', {}, 'error'));
    return;
  }

  var questionsCollection = data.DbHelper.getCollection('Questions');

  var updateClause = {};
  if (data.setData) {
    updateClause['$set'] = data.setData;
  }
  if (data.unsetData) {
    updateClause['$unset'] = data.unsetData;
  }

  var whereClause = {'_id': ObjectId(data.questionId)};


  questionsCollection.updateOne(whereClause, updateClause,
    function (err, results) {

      if (err || results.nModified < 1) {

        closeDb(data);

        callback(new exceptions.ServerException('Error updating question', {
          'setData': data.setData,
          'dbError': err
        }, 'error'));

        return;
      }

      checkToCloseDb(data);

      callback(null, data);
    });
};

//------------------------------------------------------------------------------------------------
// getQuestionsByIds
//
// Get all questions by their ids.
//
// data:
// -----
// input: DbHelper, session, userQuestions (array of id's)
// output: questions
//------------------------------------------------------------------------------------------------
module.exports.getQuestionsByIds = getQuestionsByIds;
function getQuestionsByIds(data, callback) {
  var questionsCollection = data.DbHelper.getCollection('Questions');

  for (var i = 0; i < data.userQuestions.length; i++) {
    data.userQuestions[i] = ObjectId(data.userQuestions[i]);
  }

  questionsCollection.find({'_id': {$in: data.userQuestions}}, {}, function (err, questionsCursor) {
    if (err || !questionsCursor) {

      closeDb(data);

      callback(new exceptions.ServerException('Error retrieving questions', {
        'userQuestions': userQuestions,
        'dbError': err
      }, 'error'));

      return;
    }

    questionsCursor.toArray(function (err, questions) {

      data.questions = buildQuestionsResult(questions);

      checkToCloseDb(data);

      callback(null, data);
    });

  });
}

//------------------------------------------------------------------------------------------------
// searchMyQuestions
//
// Get all questions by their ids.
//
// data:
// -----
// input: DbHelper, session, text (search text), existingQuestionIds
// output: questions
//------------------------------------------------------------------------------------------------
module.exports.searchMyQuestions = searchMyQuestions;
function searchMyQuestions(data, callback) {

  var questionsCollection = data.DbHelper.getCollection('Questions');

  for (var i = 0; i < data.existingQuestionIds.length; i++) {
    data.existingQuestionIds[i] = ObjectId(data.existingQuestionIds[i]);
  }

  var criteria =
  {
    $and: [
      {'userIdCreated': ObjectId(data.session.userId)},
      {'_id': {'$nin': data.existingQuestionIds}},
      {
        $or: [
          {'text': {$regex: '.*' + data.text + '.*'}},
          {'answers.0.text': {$regex: '.*' + data.text + '.*'}},
          {'answers.1.text': {$regex: '.*' + data.text + '.*'}},
          {'answers.2.text': {$regex: '.*' + data.text + '.*'}},
          {'answers.3.text': {$regex: '.*' + data.text + '.*'}}
        ]
      }
    ]
  };

  var sort = [['created', 'desc']];  //order by participants descending

  questionsCollection.find(criteria, {sort: sort}, function (err, questionsCursor) {
    if (err || !questionsCursor) {

      closeDb(data);

      callback(new exceptions.ServerException('Error retrieving questions by search text', {
        'text': data.text,
        'dbError': err
      }, 'error'));

      return;
    }

    questionsCursor.toArray(function (toArrayError, questions) {

      if (toArrayError) {

        closeDb(data);

        callback(new exceptions.ServerException('Error converting questions cursor to array', {
          'text': data.text,
          'dbError': err
        }, 'error'));

        return;
      }

      data.questions = buildQuestionsResult(questions);

      checkToCloseDb(data);

      callback(null, data);
    });

  });
}

//------------------------------------------------------------------------------------------------
// getGcmRegistrationIds
//
// Get getGcmRegistrationIds of all user id's passed as parameter.
//
// data:
// -----
// input: DbHelper, session, userIds (array of ObjectId("xxx")), fields ({fieldName1: 1, fieldName2: 1}) = specific fields to retrieve
// output: users (each user will contain _id, and list of specified fields)
//------------------------------------------------------------------------------------------------
module.exports.getUsers = getUsers;
function getUsers(data, callback) {

  var usersCollection = data.DbHelper.getCollection('Users');

  usersCollection.find(data.whereClause, {'gcmRegistrationId': 1}, function (err, usersCursor) {

    if (err || !usersCursor) {

      closeDb(data);

      callback(new exceptions.ServerException('Error retrieving users by their ids', {
        'userIds': data.userIds,
        'dbError': err
      }, 'error'));

      return;
    }

    usersCursor.toArray(function (toArrayError, users) {

      if (toArrayError) {

        closeDb(data);

        callback(new exceptions.ServerException('Error converting users cursor to array', {
          'userIds': data.userIds,
          'dbError': err
        }, 'error'));

        return;
      }

      data.users = users;

      checkToCloseDb(data);

      callback(null, data);
    });

  });
}

//------------------------------------------------------------------------------------------------
// syncContestsAvatars
//
// Updates the avatar in contests in which my avatar appears
//
// data:
// -----
// input: DbHelper, session
// output: contests
//------------------------------------------------------------------------------------------------
module.exports.syncContestsAvatars = syncContestsAvatars;
function syncContestsAvatars(data, callback) {

  var contestsCollection = data.DbHelper.getCollection('Contests');

  var whereClause = {};
  //I joined this contest (covers case where I created it or leading the contest or any team
  whereClause['users.' + data.session.userId] = {$exists: true};

  contestsCollection.find(whereClause, {}, function (err, contestsCursor) {
    if (err || !contestsCursor) {

      closeDb(data);

      callback(new exceptions.ServerException('Error retrieving contests to upgrade guest avatars', {
        'userId': data.session.userId,
        'dbError': err
      }, 'error'));

      return;
    }

    contestsCursor.toArray(function (err, contests) {

      data.contests = contests;

      async.forEach(contests, function (contest, contestCallback) {

        var setObject = {'$set': {}};
        var setThisContest = false;

        if (contest.creator.id.toString() === data.session.userId.toString()) {
          setObject['$set']['creator.name'] = data.session.name;
          contest.creator.name = data.session.name;
          setObject['$set']['creator.avatar.id'] = data.session.avatar;
          contest.creator.avatar.id = data.session.avatar;
          setThisContest = true;
        }
        if (contest.leader.id.toString() === data.session.userId.toString()) {
          setObject['$set']['leader.name'] = data.session.name;
          contest.leader.name = data.session.name;
          setObject['$set']['leader.avatar.id'] = data.session.avatar;
          contest.leader.avatar.id = data.session.avatar;
          setThisContest = true;
        }
        if (contest.teams[0].leader && contest.teams[0].leader.id.toString() === data.session.userId.toString()) {
          setObject['$set']['teams.0.leader.name'] = data.session.name;
          contest.teams[0].leader.name = data.session.name;
          setObject['$set']['teams.0.leader.avatar.id'] = data.session.avatar;
          contest.teams[0].leader.avatar.id = data.session.avatar;
          setThisContest = true;
        }
        if (contest.teams[1].leader && contest.teams[1].leader.id.toString() === data.session.userId.toString()) {
          setObject['$set']['teams.1.leader.name'] = data.session.name;
          contest.teams[1].leader.name = data.session.name;
          setObject['$set']['teams.1.leader.avatar.id'] = data.session.avatar;
          contest.teams[1].leader.avatar.id = data.session.avatar;
          setThisContest = true;
        }

        if (!setThisContest) {
          contestCallback();
          return;
        }

        contestsCollection.updateOne({'_id': ObjectId(contest._id)}, setObject,
          function (err, results) {

            if (err || results.nModified < 1) {
              contestCallback(); //notify finished itteration
              callback(new exceptions.ServerException('Error updating contest with id: ', {
                'userId': data.session.userId,
                'contestId': contest._id,
                'dbError': err
              }, 'error'));
              return;
            }

            contestCallback(); //notify finished itteration

          });
      }, function (err) {
        if (err) {
          closeDb(data);
          callback(new exceptions.ServerException('Error synching contest avatars', {
            'userId': data.session.userId,
            'dbError': err
          }, 'error'));
          return;
        }
        checkToCloseDb(data);

        callback(null, data);
      });

    });

  });
}

//------------------------------------------------------------------------------------------------
// checkIfFacebookIdExists
//
// Checks if a user with a given facebookUserId is already registered
// (called in upgradeGuest scenario)
//
// data:
// -----
// input: DbHelper, session
// output: facebookExists (boolean)
//------------------------------------------------------------------------------------------------
module.exports.checkIfFacebookIdExists = checkIfFacebookIdExists;
function checkIfFacebookIdExists(data, callback) {

  var usersCollection = data.DbHelper.getCollection('Users');

  usersCollection.findOne({facebookUserId: data.facebookUserId}, {}, function (err, user) {
    if (err) {
      closeDb(data);
      callback(new exceptions.ServerException('Error checking if facebook id exists', {
        'facebookUserId': facebookUserId,
        'userId': data.session.userId,
        'dbError': err
      }, 'error'));
      return;
    }

    if (user) {
      data.facebookExists = true;
    }

    checkToCloseDb(data);

    callback(null, data);
  });


}
