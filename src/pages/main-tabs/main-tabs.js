var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var ionic_angular_1 = require('ionic-angular');
var client_1 = require('../../providers/client');
var ACTION_UPDATE_CONTEST = 'contestUpdated';
var ACTION_REMOVE_CONTEST = 'contestRemoved';
var ACTION_FORCE_REFRESH = 'forceRefresh';
var MainTabsPage = (function () {
    function MainTabsPage() {
        this.client = client_1.Client.getInstance();
        // set the root pages for each tab
        this.rootMyContestsPage = this.client.getPage('MyContestsPage');
        this.rootRunningContestsPage = this.client.getPage('RunningContestsPage');
        this.rootLeaderboardsPage = this.client.getPage('LeaderboardsPage');
    }
    MainTabsPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.contestCreatedHandler = function () {
            //Force refresh my contests only - leading contests will hardly be influenced by a new
            //contest just created
            _this.publishActionToTab(0, ACTION_FORCE_REFRESH);
        };
        this.contestUpdatedHandler = function (eventData) {
            var contest = eventData[0];
            var previousStatus = eventData[1];
            var currentStatus = eventData[2];
            if (previousStatus === currentStatus) {
                //Was finished and remained finished, or was running and still running...
                switch (currentStatus) {
                    case 'starting':
                        //For admins - future contests - appear only in "my Contests"
                        _this.publishActionToTab(0, ACTION_UPDATE_CONTEST, contest);
                        break;
                    case 'running':
                        //Appears in my contests / running contests
                        _this.publishActionToTab(0, ACTION_UPDATE_CONTEST, contest);
                        _this.publishActionToTab(1, ACTION_UPDATE_CONTEST, contest);
                        break;
                    case 'finished':
                        //Appears in recently finished contests
                        _this.publishActionToTab(2, ACTION_UPDATE_CONTEST, contest);
                        break;
                }
            }
            else {
                switch (previousStatus) {
                    case 'starting':
                        if (currentStatus === 'running') {
                            //Update my contests
                            _this.publishActionToTab(0, ACTION_UPDATE_CONTEST, contest);
                            //Refresh running contests - might appear there
                            _this.publishActionToTab(1, ACTION_FORCE_REFRESH);
                        }
                        else {
                            //finished
                            //Remove from my contests
                            _this.publishActionToTab(0, ACTION_REMOVE_CONTEST, contest._id);
                            //Refresh recently finished contests
                            _this.publishActionToTab(2, ACTION_FORCE_REFRESH);
                        }
                        break;
                    case 'running':
                        if (currentStatus === 'starting') {
                            //Update my contests
                            _this.publishActionToTab(0, ACTION_UPDATE_CONTEST, contest);
                            //Remove from running contests
                            _this.publishActionToTab(1, ACTION_REMOVE_CONTEST, contest._id);
                        }
                        else {
                            //finished
                            //Remove from my contests and from running contests
                            _this.publishActionToTab(0, ACTION_REMOVE_CONTEST, contest._id);
                            _this.publishActionToTab(1, ACTION_REMOVE_CONTEST, contest._id);
                            //Refresh recently finished contests
                            _this.publishActionToTab(2, ACTION_FORCE_REFRESH);
                        }
                        break;
                    case 'finished':
                        //Remove from finished contests
                        _this.publishActionToTab(2, ACTION_REMOVE_CONTEST, contest._id);
                        if (currentStatus === 'starting') {
                            //Refresh my contests
                            _this.publishActionToTab(0, ACTION_FORCE_REFRESH);
                        }
                        else {
                            //running
                            //Refresh my contests
                            _this.publishActionToTab(0, ACTION_FORCE_REFRESH);
                            //Refresh running contests
                            _this.publishActionToTab(1, ACTION_FORCE_REFRESH);
                        }
                        break;
                }
            }
        };
        this.contestRemovedHandler = function (eventData) {
            var contestId = eventData[0];
            var finishedContest = eventData[1];
            if (!finishedContest) {
                //Try to remove it from 'my contests' and 'running contests' tabs
                _this.publishActionToTab(0, ACTION_REMOVE_CONTEST, contestId);
                _this.publishActionToTab(1, ACTION_REMOVE_CONTEST, contestId);
            }
            else {
                //Try to remove it from the recently finished tab
                _this.publishActionToTab(2, ACTION_REMOVE_CONTEST, contestId);
            }
        };
        this.languageChangedHandler = function (eventData) {
            if (eventData[0]) {
                window.location.reload();
            }
            else {
                //Just refresh the contests to reflect the new language
                _this.publishActionToTab(0, ACTION_FORCE_REFRESH);
                _this.publishActionToTab(1, ACTION_FORCE_REFRESH);
                _this.publishActionToTab(2, ACTION_FORCE_REFRESH);
            }
        };
        this.switchedToFacebookHandler = function () {
            //Just refresh the contests to reflect the user
            _this.publishActionToTab(0, ACTION_FORCE_REFRESH);
            _this.publishActionToTab(1, ACTION_FORCE_REFRESH);
            _this.publishActionToTab(2, ACTION_FORCE_REFRESH);
        };
        this.serverPopupHandler = function (eventData) {
            return _this.client.showModalPage('ServerPopupPage', { 'serverPopup': eventData[0] });
        };
        this.noPersonalContestsHandler = function () {
            _this.mainTabs.select(1); //Switch to "Running contests"
        };
        this.showLeaderContestsHandler = function () {
            _this.mainTabs.select(1); //Switch to "Running contests"
        };
        this.client.events.subscribe('app:contestCreated', this.contestCreatedHandler);
        this.client.events.subscribe('app:contestUpdated', this.contestUpdatedHandler);
        this.client.events.subscribe('app:contestRemoved', this.contestRemovedHandler);
        this.client.events.subscribe('app:languageChanged', this.languageChangedHandler);
        this.client.events.subscribe('app:switchedToFacebook', this.switchedToFacebookHandler);
        this.client.events.subscribe('app:serverPopup', this.serverPopupHandler);
        this.client.events.subscribe('app:noPersonalContests', this.noPersonalContestsHandler);
        this.client.events.subscribe('app:showLeadingContests', this.showLeaderContestsHandler);
    };
    MainTabsPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:contestCreated', this.contestCreatedHandler);
        this.client.events.unsubscribe('app:contestUpdated', this.contestUpdatedHandler);
        this.client.events.unsubscribe('app:contestRemoved', this.contestRemovedHandler);
        this.client.events.unsubscribe('app:languageChanged', this.languageChangedHandler);
        this.client.events.unsubscribe('app:switchedToFacebook', this.switchedToFacebookHandler);
        this.client.events.unsubscribe('app:serverPopup', this.serverPopupHandler);
        this.client.events.unsubscribe('app:noPersonalContests', this.noPersonalContestsHandler);
        this.client.events.unsubscribe('app:showLeadingContests', this.showLeaderContestsHandler);
    };
    MainTabsPage.prototype.ionViewDidEnter = function () {
        //Events here could be serverPopup just as the app loads - the page should be fully visible
        this.client.processInternalEvents();
        //Came from external deep linking - only for the case the the appp is running
        if (this.client.deepLinkContestId) {
            var contestId = this.client.deepLinkContestId;
            this.client.deepLinkContestId = null;
            this.client.displayContestById(contestId).then(function () {
            }, function () {
            });
        }
    };
    MainTabsPage.prototype.publishActionToTab = function (index, action, param) {
        var eventName = 'app:';
        switch (index) {
            case 0:
                eventName += 'myContests';
                break;
            case 1:
                eventName += 'runningContests';
                break;
            case 2:
                eventName += 'recentlyFinishedContests';
                break;
        }
        eventName += ':' + action;
        if (param) {
            this.client.events.publish(eventName, param);
        }
        else {
            this.client.events.publish(eventName);
        }
    };
    __decorate([
        core_1.ViewChild(ionic_angular_1.Tabs), 
        __metadata('design:type', ionic_angular_1.Tabs)
    ], MainTabsPage.prototype, "mainTabs", void 0);
    MainTabsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/main-tabs/main-tabs.html'
        }), 
        __metadata('design:paramtypes', [])
    ], MainTabsPage);
    return MainTabsPage;
})();
exports.MainTabsPage = MainTabsPage;
//# sourceMappingURL=main-tabs.js.map