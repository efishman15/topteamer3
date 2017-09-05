var path = require('path');
var async = require('async');
var exceptions = require(path.resolve(__dirname, '../utils/exceptions'));
var generalUtils = require(path.resolve(__dirname, '../utils/general'));
var Leaderboard = require('agoragames-leaderboard');

//Open connection to general leaderboards (not timebased)
var generalLeaderboard = new Leaderboard('topteamer:general');

//---------------------------------------------------------------------------------------------------------------------------
// private functions
//---------------------------------------------------------------------------------------------------------------------------
function getLeaderboardMember(session, isGeneralLeaderboard) {

  var key = session.userId.toString();

  var memberData;
  if (session.facebookUserId) {
    if (isGeneralLeaderboard) {
      key = session.facebookUserId;
    }
    memberData = session.name + '|0|' + session.facebookUserId;
  }
  else {
    memberData = session.name + '|1|' + session.avatar;
  }

  return {key: key, memberData: memberData};
}

//---------------------------------------------------------------------------------------------------------------------------
// Get the general contest leaderboard
//---------------------------------------------------------------------------------------------------------------------------
module.exports.getContestLeaderboard = getContestLeaderboard;
function getContestLeaderboard(contestId) {
  return new Leaderboard('topteamer:contest_' + contestId);
}

//---------------------------------------------------------------------------------------------------------------------------
// Get the contest leaderboard of a specific team
//---------------------------------------------------------------------------------------------------------------------------
module.exports.getTeamLeaderboard = getTeamLeaderboard;
function getTeamLeaderboard(contestId, teamId) {
  return new Leaderboard('topteamer:contest_' + contestId + '_team' + teamId);
}

//---------------------------------------------------------------------------------------------------------------------------
// Get the weekly leaderboard
//---------------------------------------------------------------------------------------------------------------------------
module.exports.getWeeklyLeaderboard = getWeeklyLeaderboard;
function getWeeklyLeaderboard() {
  return new Leaderboard('topteamer:weekly_' + generalUtils.getYearWeek());
}

//---------------------------------------------------------------------------------------------------------------------------
// prepareLeaderObject - parse member_data
//---------------------------------------------------------------------------------------------------------------------------
function prepareLeaderObject(id, leader, outsideLeaderboard) {
  var memberDataParts = leader.member_data.split('|');
  var leaderObject = {
    id: id,
    rank: leader.rank,
    score: leader.score,
    name: memberDataParts[0],
    avatar: {type: parseInt(memberDataParts[1],10), id: memberDataParts[2]}
  };

  if (outsideLeaderboard) {
    leaderObject.outside = true;
  }

  return leaderObject;
}

//---------------------------------------------------------------------------------------------------------------------------
// addScore
//
// The following leaderboards are updated:
// =======================================
// 1. Contest general leaderboard - 'contest_<contestId>'
// 2. Contest team leaderboard - 'contest_<contestId>_team_<teamId>'
// 3. General Leaderboard (ever) - 'general' (will be used to display my friends' scores)
// 4. Weekly leaderboard - weekly_<YearWeek>
//
// @deltaScore - the score currently achieved which should be increased in all leaderboards
// @session - facebookUserId (for facebook) or UserId (for guests) as the primary member key in all leaderboards
// (to be able to retrieve friends leaderboard)
//---------------------------------------------------------------------------------------------------------------------------
module.exports.addScore = addScore;
function addScore(contestId, teamId, deltaScore, session) {

  var leaderboardMember = getLeaderboardMember(session, false);

  var contestGeneralLeaderboard = getContestLeaderboard(contestId);
  var contestTeamLeaderboard = getTeamLeaderboard(contestId, teamId);

  contestGeneralLeaderboard.changeScoreFor(leaderboardMember.key, deltaScore, function (reply) {
    contestGeneralLeaderboard.updateMemberData(leaderboardMember.key, leaderboardMember.memberData, function (reply) {
      contestGeneralLeaderboard.disconnect();
    });
  });

  contestTeamLeaderboard.changeScoreFor(leaderboardMember.key, deltaScore, function (reply) {
    contestTeamLeaderboard.updateMemberData(leaderboardMember.key, leaderboardMember.memberData, function (reply) {
      contestTeamLeaderboard.disconnect();
    });
  });

  addScoreToGeneralLeaderboards(deltaScore, session);

};

//---------------------------------------------------------------------------------------------------------------------------
// addScore
//
// The following leaderboards are updated:
// =======================================
// 1. Contest general leaderboard - 'contest_<contestId>'
// 2. Contest team leaderboard - 'contest_<contestId>_team_<teamId>'
// 3. General Leaderboard (ever) - 'general' (will be used to display my friends' scores)
// 4. Weekly leaderboard - weekly_<YearWeek>
//
// @deltaScore - the score currently achieved which should be increased in all leaderboards
// @session - facebookUserId (for facebook) or UserId (for guests) as the primary member key in all leaderboards
// (to be able to retrieve friends leaderboard)
//---------------------------------------------------------------------------------------------------------------------------
module.exports.addScoreToGeneralLeaderboards = addScoreToGeneralLeaderboards;
function addScoreToGeneralLeaderboards(deltaScore, session) {

  var leaderboardMember = getLeaderboardMember(session, false);
  var weeklyLeaderboard = getWeeklyLeaderboard();

  weeklyLeaderboard.changeScoreFor(leaderboardMember.key, deltaScore, function (reply) {
    weeklyLeaderboard.updateMemberData(leaderboardMember.key, leaderboardMember.memberData, function (reply) {
      weeklyLeaderboard.disconnect();
    });
  });

  var generalLeaderboardMember = getLeaderboardMember(session, true);
  generalLeaderboard.changeScoreFor(generalLeaderboardMember.key, deltaScore, function (reply) {
    generalLeaderboard.updateMemberData(generalLeaderboardMember.key, generalLeaderboardMember.memberData);
  });

};

//---------------------------------------------------------------------------------------------------------------------------
// getLeaders
//
// Retrieve the first page of the input leaderboard. If my user is not included in this page, add myself to the bottom
// with flagging outside=true.
//
// data: leaderboard
// output: data.leaders
//---------------------------------------------------------------------------------------------------------------------------
module.exports.getLeaders = getLeaders;
function getLeaders(data, callback) {

  var options = {
    'withMemberData': true,
    'sortBy': 'rank',
    'pageSize': generalUtils.settings.server.leaderboard.pageSize
  };

  data.leaders = [];

  var myLeaderboardMember = getLeaderboardMember(data.session, false);

  data.leaderboard.leaders(0, options, function (leaders) {
    for (var i = 0; i < leaders.length; i++) {

      if (leaders[i].member === myLeaderboardMember.key) {
        data.inLeaderboard = true;
      }

      data.leaders.push(prepareLeaderObject(i, leaders[i]));

    }

    if (!data.inLeaderboard && data.leaders.length > 0) {

      //I am not in the first page of the leaderboard
      var options = {'withMemberData': true, 'sortBy': 'rank', 'pageSize': 1};
      data.leaderboard.aroundMe(myLeaderboardMember.key, options, function (leaders) {
        if (leaders && leaders.length > 0) {
          //I am in the leaderboard (not at the first page)
          data.leaders.push(prepareLeaderObject(data.leaders.length, leaders[0], true));
          callback(null, data);
        }
        else {
          //I am not in the leaderboard at all (never played for that leaderboard)
          callback(null, data);
        }
      });
    }
    else {
      //I am in the first page of the leaderboard
      callback(null, data);
    }
  });
}

//---------------------------------------------------------------------------------------------------------------------------
// getFriends
//
// Retrieve me and my friends from the general leaderboard
//
// data: session (including friends.list array of id,name objects)
// output: data.leaders
//---------------------------------------------------------------------------------------------------------------------------
module.exports.getFriends = getFriends;
function getFriends(data, callback) {

  data.leaders = [];

  var pageSize = data.pageSize ? data.pageSize : generalUtils.settings.server.leaderboard.pageSize;

  var options = {
    withMemberData: true,
    pageSize: pageSize,
    sortBy: 'rank',
    reverse: true
  };

  var myLeaderboardMember = getLeaderboardMember(data.session, true);

  var members = [];

  //add my friends - for guest mode - it will show only myself in the general leaderboard
  if (data.session.facebookUserId && data.session.friends && data.session.friends.list && data.session.friends.list.length > 0) {
    for (var i = 0; i < data.session.friends.list.length; i++) {
      members.push(data.session.friends.list[i].id);
    }
  }

  //Push myself as well
  members.push(myLeaderboardMember.key);

  generalLeaderboard.rankedInList(members, options, function (leaders) {

    //Bug of AgoraGames - does NOT return the array sorted
    leaders.sort(function compare(a, b) {
      if (a.rank < b.rank) {
        return -1;
      }
      if (a.rank > b.rank) {
        return 1;
      }
      return 0;

    })

    data.myIndex = -1;
    for (var i = 0; i < leaders.length; i++) {
      if (leaders[i].rank && data.leaders.length < pageSize) {
        data.leaders.push(prepareLeaderObject(i, leaders[i]));
        if (leaders[i].member === myLeaderboardMember.key) {
          data.myIndex = data.leaders.length - 1;
        }
      }
    }

    if (data.myIndex === -1) {
      var myUserInLeaderboard = {
        member: data.session.facebookUserId,
        score: data.session.score,
        rank: data.leaders.length,
        member_data: data.session.name
      }
      data.leaders.push(prepareLeaderObject(data.leaders.length, myUserInLeaderboard, true));
      data.myIndex = data.leaders.length - 1;
    }

    callback(null, data);
  });
}

//---------------------------------------------------------------------------------------------------------------------------
// getFriendsAboveMe
//
// getFriendsAboveMe - returns x (based on general settings) friends above me in the leaderboard
//
// data: session
// output: data.friendsAboveMe array
//---------------------------------------------------------------------------------------------------------------------------
module.exports.getFriendsAboveMe = getFriendsAboveMe;
function getFriendsAboveMe(data, callback) {

  data.pageSize = data.session.friends.list.length + 1; //Me and my friends
  getFriends(data, function (err, data) {

    if (!err && data.leaders && data.leaders.length > 0 && data.myIndex !== 0) {
      data.friendsAboveMe = [];
      for (var i = 0; i < generalUtils.settings.server.leaderboard.friendsAboveMePageSize; i++) {
        if (data.myIndex - i - 1 >= 0) {
          data.friendsAboveMe.push(data.leaders[data.myIndex - i - 1]);
        }
      }
      callback(null, data);
    }
    else {
      callback(null,data);
    }
  });
};

//---------------------------------------------------------------------------------------------------------------------------
// getPassedFriends
//
// getPassedFriends - returns all the friends that I passed (in relation to data.friendsAboveMe)
//
// data: session, friendsAboveMe (friends that previously were above me - I will be last in this array)
// output: data.passedFriends array
//---------------------------------------------------------------------------------------------------------------------------
module.exports.getPassedFriends = getPassedFriends;
function getPassedFriends(data, callback) {

  var options = {
    'withMemberData': true,
    'sortBy': 'rank',
    'pageSize': data.friendsAboveMe.length
  };

  data.passedFriends = [];

  var members = [];
  for (var i = 0; i < data.friendsAboveMe.length; i++) {
    members.push(data.friendsAboveMe[i].id); //Id is the facebookUserId which is the key of the member in the leaderboard
  }

  generalLeaderboard.rankedInList(members, options, function (leaders) {
    var reachedMyself = false;
    var friendsAfterMe = 0;

    for (var i = 0; i < leaders.length; i++) {

      if (reachedMyself) {
        data.passedFriends.push(prepareLeaderObject(leaders[i].member, leaders[i]));
        friendsAfterMe++;
      }
      else if (leaders[i].member === data.session.facebookUserId) {
        reachedMyself = true;
      }
    }

    callback(null, data);
  });

};

//---------------------------------------------------------------------------------------------------------------------------
// removeContestLeaderboards
//
// data: contestId
// output: <NA>
//---------------------------------------------------------------------------------------------------------------------------
module.exports.removeContestLeaderboards = removeContestLeaderboards;
function removeContestLeaderboards(data, callback) {
  var contestLeaderboard = getContestLeaderboard(data.contestId);

  contestLeaderboard.deleteLeaderboard(function () {

    var team0Leaderboard = getTeamLeaderboard(data.contestId, 0);
    team0Leaderboard.deleteLeaderboard(function () {

      var team1Leaderboard = getTeamLeaderboard(data.contestId, 1);
      team1Leaderboard.deleteLeaderboard(function () {

        callback(null, data);

      });

    });

  })
}

//---------------------------------------------------------------------------------------------------------------------------
// syncAvatars
//
// data: contests, session, user (name, avatar, dob)
// output: <NA>
//---------------------------------------------------------------------------------------------------------------------------
module.exports.syncAvatars = syncAvatars;
function syncAvatars(data, callback) {

  var leaderboardMember = getLeaderboardMember(data.session, false);

  //Sync weekly leaderboard
  var weeklyLeaderboard = getWeeklyLeaderboard();
  weeklyLeaderboard.updateMemberData(data.session.userId, leaderboardMember.memberData, function () {
  });

  var generalLeaderboardMember = getLeaderboardMember(data.session, true);

  //Sync general leaderboard
  if (data.session.facebookUserId) {
    //Change key in the general leaderboard to the facebookUserId so we can work with friends
    generalLeaderboard.scoreFor(data.session.userId.toString(), function(score) {
      generalLeaderboard.removeMember(data.session.userId.toString(), function () {
        generalLeaderboard.rankMember(data.session.facebookUserId, score, generalLeaderboardMember.memberData, function () {
        });
      })
    })
  }
  else {
    generalLeaderboard.updateMemberData(data.session.userId, generalLeaderboardMember.memberData, function () {
    });
  }

  async.forEach(data.contests, function (contest, callbackContest) {

    var contestLeaderboard = getContestLeaderboard(contest._id);
    contestLeaderboard.updateMemberData(data.session.userId, leaderboardMember.memberData, function () {
    });

    var team0Leaderboard = getTeamLeaderboard(contest._id, 0);
    team0Leaderboard.memberDataFor(data.session.userId, function (memberData) {
      if (memberData) {
        team0Leaderboard.updateMemberData(data.session.userId, leaderboardMember.memberData, function () {
        });
      }
    })

    var team1Leaderboard = getTeamLeaderboard(contest._id, 1);
    team1Leaderboard.memberDataFor(data.session.userId, function (memberData) {
      if (memberData) {
        team1Leaderboard.updateMemberData(data.session.userId, leaderboardMember.memberData, function () {
        });
      }
    })

    callbackContest();

  }, function(err) {

    if (err) {
      callback(new exceptions.ServerException('Error synching leaderboard avatars', {
        'userId': data.session.userId,
        'dbError': err
      }, 'error'));
      return;
    }
    callback(null, data);

  });

}

