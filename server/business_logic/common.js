var path = require('path');
var util = require('util');
var mathjs = require('mathjs');
var jsonTransformer = require('jsonpath-object-transform');
var generalUtils = require(path.resolve(__dirname, '../utils/general'));

//----------------------------------------------------
// Private functions
//
//----------------------------------------------------

//----------------------------------------------------
// getContestTitle
//
//----------------------------------------------------
function getContestTitle(contest) {

  var contestTitle = generalUtils.settings.server.facebook.openGraphStories.text[contest.language].contestTitle.format(
    {
      'team0': contest.teams[0].name.toLowerCase(),
      'team1': contest.teams[1].name.toLowerCase(),
      'subject': contest.subject.toLowerCase()
    });

  return contestTitle;
}

//----------------------------------------------------
// getOtherTeamDescription
//
//----------------------------------------------------
function getTeamDescription(contest, myTeam) {

  var team0Percentage;
  var team1Percentage;

  //Chart values
  if (contest.teams[0].score === 0 && contest.teams[1].score === 0) {
    team0Percentage = 0.5;
    team1Percentage = 0.5;
  }
  else {
    //Do relational compute
    var sum = contest.teams[0].score + contest.teams[1].score;
    team0Percentage = mathjs.round(contest.teams[0].score / sum, 2);
    team1Percentage = mathjs.round(contest.teams[1].score / sum, 2);
  }

  var propertyName;
  if (mathjs.abs(team1Percentage-team0Percentage) <= generalUtils.settings.server.facebook.openGraphStories.params.closeMatchTreshold) {
    propertyName = 'teamDescriptionCloseMatch'
  }
  else if (contest.teams[myTeam].score > contest.teams[1 - myTeam].score) {
    propertyName = 'teamDescriptionWinning';
  }
  else {
    propertyName = 'teamDescriptionLosing';
  }

  var description = generalUtils.settings.server.facebook.openGraphStories.text[contest.language][propertyName];
  description = description.format({
    'name': contest.teams[1 - myTeam].name.toLowerCase(),
    'subject': contest.subject.toLowerCase()
  });

  return description;
}

//---------------------------------------------------------------------------------
// addXp
//
// data: session
// output: data.xpProgress object created/modified ready to be sent to the client
//---------------------------------------------------------------------------------
module.exports.addXp = function (data, action) {

  if (!data.xpProgress) {
    data.xpProgress = new generalUtils.XpProgress(data.session.xp, data.session.rank);
  }

  data.xpProgress.addXp(data.session, action);

}

//---------------------------------------------------------------------
// get Open graph object
//---------------------------------------------------------------------
module.exports.getOpenGraphObject = getOpenGraphObject;
function getOpenGraphObject(objectType, objectData, isCrawlerMode, isMobile) {

  var facebookObject = {};

  if (!isCrawlerMode && !isMobile) {
    //Web mode - post will have a single "object" property like this: {"team" : "some Url"}
    facebookObject[objectType] = objectData.url;
    return {'facebookObject': facebookObject};
  }

  var redirectUrl;
  facebookObject = JSON.parse(JSON.stringify(generalUtils.settings.server.facebook.openGraphStories.objects[objectType]));

  switch (objectType) {
    case 'contest':
    case 'contestLeader':
      facebookObject['og:title'] = getContestTitle(objectData.contest);
      facebookObject['og:url'] = facebookObject['og:url'].format({'contestId': objectData.contest._id.toString()});
      facebookObject['og:description'] = generalUtils.settings.server.facebook.openGraphStories.text[objectData.contest.language].gameDescription;
      redirectUrl = objectData.contest.link;
      break;
    case 'team':
    case 'teamLeader':
      facebookObject['og:title'] = generalUtils.settings.server.facebook.openGraphStories.text[objectData.contest.language].teamTitle.format({'name': objectData.contest.teams[objectData.team].name.toLowerCase()});
      facebookObject['og:description'] = getTeamDescription(objectData.contest, objectData.team);
      facebookObject['og:url'] = facebookObject['og:url'].format({
        'contestId': objectData.contest._id.toString(),
        'teamId': objectData.team
      });
      redirectUrl = objectData.contest.link;
      break;
    case 'profile':
      facebookObject['og:url'] = facebookObject['og:url'].format({
        'facebookUserId': objectData.facebookUserId,
        'language': objectData.language
      });
      facebookObject['og:image'] = facebookObject['og:image'].format({'facebookUserId': objectData.facebookUserId});
      facebookObject['og:description'] = generalUtils.settings.server.facebook.openGraphStories.text[objectData.language].gameDescription;
      redirectUrl = generalUtils.settings.client.general.downloadUrl[objectData.language];
      break;
  }

  if (isCrawlerMode) {
    facebookObject['fb:app_id'] = generalUtils.settings.server.facebook.appId;
    facebookObject['redirectUrl'] = redirectUrl;
  }

  return {'facebookObject': facebookObject};

};

//----------------------------------------------------------------------------------------------------------------------
// getAvatar
//
// input: session
// return avatar object {tyoe: 0 (Facebook), 1(Guest), id: FacebookUserId or AvatarImage (under images/avatars/xxx.png
//----------------------------------------------------------------------------------------------------------------------
module.exports.getAvatar = function (session) {

  if (session.facebookUserId) {
    //Facebook
    return {type: 0, id: session.facebookUserId};
  }
  else {
    //Guest
    return {type: 1, id: session.avatar};
  }

}

//---------------------------------------------------------------------
// prepareContestForClient
//---------------------------------------------------------------------
module.exports.prepareContestForClient = prepareContestForClient;
function prepareContestForClient(contest, session) {

  var contestForClient = jsonTransformer(contest, session.isAdmin ? generalUtils.settings.server.contest.details.adminClientTemplate : generalUtils.settings.server.contest.details.clientTemplate);
  if (contest.creator.id.toString() === session.userId.toString()) {
    contestForClient.owner = true;
  }

  if (contest.users[session.userId.toString()]) {
    contestForClient.myTeam = contest.users[session.userId.toString()].team;
  }

  contestForClient.participants = contest.participants + contest.systemParticipants;
  if (session.isAdmin) {
    contestForClient.systemParticipants = contest.systemParticipants;
  }

  return contestForClient;
};
