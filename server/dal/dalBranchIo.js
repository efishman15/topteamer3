var path = require('path');
var BRANCH_END_POINT_PREFIX = 'https://api.branch.io/v1/url/bulk/';
var generalUtils = require(path.resolve(__dirname,'../utils/general'));
var exceptions = require(path.resolve(__dirname,'../utils/exceptions'));
var httpUtils = require(path.resolve(__dirname,'../utils/http'));
var util = require('util');

//---------------------------------------------------------------------------------------------------------------------------------
// createLink
//
// data: contest (only _id is required)
// output: data.contest.teams[0].link, data.contest.teams[1].link
//
// create a new link in Branch IO
//---------------------------------------------------------------------------------------------------------------------------------
module.exports.createContestLinks = createContestLinks;
function createContestLinks(data, callback) {

    var postData = [];

    postData.push({'feature': 'contest','data': {'$og_redirect': util.format(generalUtils.settings.server.branch.contestLink, data.contest._id), 'contestId': data.contest._id}});
    postData.push({'feature': 'contestLeader','data': {'$og_redirect': util.format(generalUtils.settings.server.branch.contestLeaderLink, data.contest._id), 'contestId': data.contest._id}});
    postData.push({'feature': 'team', 'data': {'$og_redirect': util.format(generalUtils.settings.server.branch.teamLink, data.contest._id, 0) ,'contestId': data.contest._id, 'teamId' : 0}});
    postData.push({'feature': 'teamLeader', 'data': {'$og_redirect': util.format(generalUtils.settings.server.branch.teamLeaderLink, data.contest._id, 0), 'contestId': data.contest._id,'teamId' : 0}});
    postData.push({'feature': 'team', 'data': {'$og_redirect': util.format(generalUtils.settings.server.branch.teamLink, data.contest._id, 1) ,'contestId': data.contest._id, 'teamId' : 1}});
    postData.push({'feature': 'teamLeader', 'data': {'$og_redirect': util.format(generalUtils.settings.server.branch.teamLeaderLink, data.contest._id, 1), 'contestId': data.contest._id,'teamId' : 1}});

    var options = {
        'url': BRANCH_END_POINT_PREFIX + generalUtils.settings.server.branch.key,
        'body': postData,
        'json': true
    };

    httpUtils.post(options, function (err, branchData) {

      if (err) {
        callback(err);
        return;
      }

      //Contest link (primary)
        if (branchData[0].error) {
            callback(new exceptions.ServerException('Error producing link 0', {'postData': postData[0]},'error'));
            return;
        }
        data.contest.link = branchData[0].url;

        //Contest leader (secondary - for open graph to point to the right og:type object)
        if (branchData[1].error) {
            callback(new exceptions.ServerException('Error producing link 1', {'postData': postData[1]},'error'));
            return;
        }
        data.contest.leaderLink = branchData[1].url;

        //Team 0 link
        if (branchData[2].error) {
            callback(new exceptions.ServerException('Error producing link 2', {'postData': postData[2]},'error'));
            return;
        }
        data.contest.teams[0].link = branchData[2].url;

        //Team 0 Leader link
        if (branchData[3].error) {
            callback(new exceptions.ServerException('Error producing link 3', {'postData': postData[3]},'error'));
            return;
        }
        data.contest.teams[0].leaderLink = branchData[3].url;

        //Team 1 link
        if (branchData[4].error) {
            callback(new exceptions.ServerException('Error producing link 4', {'postData': postData[4]},'error'));
            return;
        }
        data.contest.teams[1].link = branchData[4].url;

        //Team 1 Leader link
        if (branchData[5].error) {
            callback(new exceptions.ServerException('Error producing link 5', {'postData': postData[5]},'error'));
            return;
        }
        data.contest.teams[1].leaderLink = branchData[5].url;

        callback(null, data);

    });
}
