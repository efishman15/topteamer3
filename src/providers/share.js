var _this = this;
var client_1 = require('./client');
var objects_1 = require('../objects/objects');
var analyticsService = require('./analytics');
var EMAIL_REF = '?ref=shareEmail';
exports.getVariables = function (contest, isNewContest) {
    var client = client_1.Client.getInstance();
    var shareVariables = new objects_1.ShareVariables();
    var subjectField;
    var bodyField;
    var params = {};
    shareVariables.shareImage = client.settings.general.baseUrl + client.settings.general.logoUrl;
    if (contest) {
        params['team0'] = contest.teams[0].name.toLowerCase();
        params['team1'] = contest.teams[1].name.toLowerCase();
        shareVariables.shareUrl = contest.link;
        if (isNewContest) {
            subjectField = 'SHARE_SUBJECT_NEW_CONTEST';
            bodyField = 'SHARE_BODY_NEW_CONTEST';
        }
        else if (contest.myTeam === 0 || contest.myTeam === 1) {
            params['myTeam'] = contest.teams[contest.myTeam].name.toLowerCase();
            params['otherTeam'] = contest.teams[1 - contest.myTeam].name.toLowerCase();
            subjectField = 'SHARE_SUBJECT_CONTEST_JOINED';
            bodyField = 'SHARE_BODY_CONTEST_JOINED';
        }
        else {
            subjectField = 'SHARE_SUBJECT_CONTEST_NOT_JOINED';
            bodyField = 'SHARE_BODY_CONTEST_NOT_JOINED';
        }
    }
    else {
        shareVariables.shareUrl = client.settings.general.downloadUrl[client.currentLanguage.value];
        subjectField = 'SHARE_SUBJECT_GENERAL';
        bodyField = 'SHARE_BODY_GENERAL';
    }
    shareVariables.shareSubject = client.translate(subjectField, params);
    shareVariables.shareBodyNoUrl = client.translate(bodyField, params);
    shareVariables.shareBody = shareVariables.shareBodyNoUrl + ' ' + shareVariables.shareUrl;
    shareVariables.shareBodyEmail = shareVariables.shareBody + EMAIL_REF;
    return shareVariables;
};
exports.mobileDiscoverSharingApps = function () {
    var client = client_1.Client.getInstance();
    var shareVariables = _this.getVariables();
    var promises = [];
    client.settings.share.mobile.discoverApps.forEach(function (shareApp) {
        promises.push(_this.mobileDiscoverApp(client, shareApp, shareVariables));
    });
    Promise.all(promises).then(function () {
        for (var i = 0; i < client.settings.share.mobile.discoverApps.length; i++) {
            if (client.settings.share.mobile.discoverApps[i].package[client.clientInfo.platform].installed && client.shareApps.length < client.settings.share.mobile.maxApps) {
                client.shareApps.push(new objects_1.ClientShareApp(client.settings.share.mobile.discoverApps[i].name, client.settings.share.mobile.discoverApps[i].title, client.settings.share.mobile.discoverApps[i].image));
            }
            else if (client.shareApps.length === client.settings.share.mobile.maxApps) {
                break;
            }
        }
        if (client.shareApps.length < client.settings.share.mobile.maxApps) {
            for (var i = 0; i < client.settings.share.mobile.extraApps.length; i++) {
                if (client.shareApps.length < client.settings.share.mobile.maxApps) {
                    client.shareApps.push(client.settings.share.mobile.extraApps[i]);
                }
                else {
                    break;
                }
            }
        }
    }, function () {
    });
};
exports.mobileDiscoverApp = function (client, shareApp, shareVariables) {
    return new Promise(function (resolve, reject) {
        window.plugins.socialsharing.canShareVia(shareApp.package[client.clientInfo.platform].name, shareVariables.shareBodyNoUrl, shareVariables.shareSubject, shareVariables.shareImage, shareVariables.shareUrl, function (result) {
            if (result === 'OK' && client.shareApps.length < client.settings.share.mobile.maxApps) {
                //Not inserting directly to client.shareApps because it might be inserted not in the same
                //order (async) of apps as was determined by the server
                shareApp.package[client.clientInfo.platform].installed = true;
            }
            resolve();
        }, function () {
            resolve();
        });
    });
};
exports.mobileShare = function (appName, contest, isNewContest) {
    return new Promise(function (resolve, reject) {
        var shareVariables = _this.getVariables(contest, isNewContest);
        switch (appName) {
            case 'whatsapp':
                window.plugins.socialsharing.shareViaWhatsApp(shareVariables.shareBodyNoUrl, shareVariables.shareImage, shareVariables.shareUrl, function () {
                    resolve();
                }, function (err) {
                    analyticsService.logError('WhatsApp Share', err);
                    reject();
                });
                break;
            case 'facebook':
                window.plugins.socialsharing.shareViaFacebook(shareVariables.shareBodyNoUrl, shareVariables.shareImage, shareVariables.shareUrl, function () {
                    resolve();
                }, function (err) {
                    analyticsService.logError('Facebook Share', err);
                    reject();
                });
                break;
            case 'instagram':
                window.plugins.socialsharing.shareViaInstagram(shareVariables.shareBody, shareVariables.shareImage, function () {
                    resolve();
                }, function (err) {
                    analyticsService.logError('Instagram Share', err);
                    reject();
                });
                break;
            case 'twitter':
                window.plugins.socialsharing.shareViaTwitter(shareVariables.shareBodyNoUrl, shareVariables.shareImage, shareVariables.shareUrl, function () {
                    resolve();
                }, function (err) {
                    analyticsService.logError('Twitter Share', err);
                    reject();
                });
                break;
            case 'sms':
                window.plugins.socialsharing.shareViaSMS({ 'message': shareVariables.shareBody }, null, //Phone numbers - user will type
                function () {
                    resolve();
                }, function (err) {
                    analyticsService.logError('SMS Share', err);
                    reject();
                });
                break;
            case 'email':
                window.plugins.socialsharing.shareViaEmail(shareVariables.shareBodyEmail, shareVariables.shareSubject, null, //To
                null, //Cc
                null, //Bcc
                shareVariables.shareImage, function () {
                    resolve();
                }, function (err) {
                    analyticsService.logError('Email Share', err);
                    reject();
                });
                break;
            default:
                var options = {};
                options.message = shareVariables.shareBodyNoUrl;
                options.subject = shareVariables.shareSubject;
                options.files = [shareVariables.shareImage];
                options.url = shareVariables.shareUrl;
                window.plugins.socialsharing.shareWithOptions(options, function () {
                    resolve();
                }, function (err) {
                    analyticsService.logError('General Mobile Share', err);
                    reject();
                });
                break;
        }
    });
};
//# sourceMappingURL=share.js.map