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
var simple_tabs_1 = require('../../components/simple-tabs/simple-tabs');
var simple_tab_1 = require('../../components/simple-tab/simple-tab');
var contest_list_1 = require('../../components/contest-list/contest-list');
var leaders_1 = require('../../components/leaders/leaders');
var client_1 = require('../../providers/client');
var analyticsService = require('../../providers/analytics');
var connectService = require('../../providers/connect');
var LeaderboardsPage = (function () {
    function LeaderboardsPage() {
        this.client = client_1.Client.getInstance();
    }
    LeaderboardsPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.contestUpdatedHandler = function (eventData) {
            _this.contestList.updateContest(eventData[0]);
        };
        this.contestRemovedHandler = function (eventData) {
            _this.contestList.removeContest(eventData[0]);
        };
        this.forceRefreshHandler = function () {
            _this.refreshList(true).then(function () {
            }, function () {
            });
        };
        this.switchedToFacebookHandler = function () {
            switch (_this.mode) {
                case 'contests':
                    _this.nextTimeForceRefreshFriends = true;
                    _this.nextTimeForceRefreshWeekly = true;
                    _this.contestList.refresh(true).then(function () {
                    }, function () {
                    });
                    break;
                case 'friends':
                    _this.nextTimeForceRefreshContests = true;
                    _this.nextTimeForceRefreshWeekly = true;
                    _this.showFriendsLeaderboard(true).then(function () {
                    }, function () {
                    });
                    break;
                case 'weekly':
                    _this.nextTimeForceRefreshContests = true;
                    _this.nextTimeForceRefreshFriends = true;
                    _this.showWeeklyLeaderboard(true).then(function () {
                    }, function () {
                    });
                    break;
            }
        };
        this.leaderboardsUpdatedHandler = function () {
            switch (_this.mode) {
                case 'contests':
                    _this.contestList.refresh(true).then(function () {
                    }, function () {
                    });
                    break;
                case 'friends':
                    _this.showFriendsLeaderboard(true).then(function () {
                    }, function () {
                    });
                    break;
                case 'weekly':
                    _this.showWeeklyLeaderboard(true).then(function () {
                    }, function () {
                    });
                    break;
            }
        };
        this.client.events.subscribe('app:recentlyFinishedContests:contestUpdated', this.contestUpdatedHandler);
        this.client.events.subscribe('app:recentlyFinishedContests:contestRemoved', this.contestRemovedHandler);
        this.client.events.subscribe('app:recentlyFinishedContests:forceRefresh', this.forceRefreshHandler);
        this.client.events.subscribe('app:switchedToFacebook', this.switchedToFacebookHandler);
        this.client.events.subscribe('app:leaderboardsUpdated', this.leaderboardsUpdatedHandler);
    };
    LeaderboardsPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:recentlyFinishedContests:contestUpdated', this.contestUpdatedHandler);
        this.client.events.unsubscribe('app:recentlyFinishedContests:contestRemoved', this.contestRemovedHandler);
        this.client.events.unsubscribe('app:recentlyFinishedContests:forceRefresh', this.forceRefreshHandler);
        this.client.events.unsubscribe('app:switchedToFacebook', this.switchedToFacebookHandler);
        this.client.events.unsubscribe('app:leaderboardsUpdated', this.leaderboardsUpdatedHandler);
    };
    LeaderboardsPage.prototype.ionViewWillEnter = function () {
        this.simpleTabsComponent.switchToTab(0);
    };
    LeaderboardsPage.prototype.displayRecentlyFinishedContestsTab = function () {
        analyticsService.track('page/leaderboard/contests');
        this.mode = 'contests';
        var forceRefresh = false;
        if (this.nextTimeForceRefreshContests) {
            this.nextTimeForceRefreshContests = false;
            forceRefresh = true;
        }
        this.showRecentlyFinishedContests(forceRefresh).then(function () {
        }, function () {
        });
    };
    LeaderboardsPage.prototype.showRecentlyFinishedContests = function (forceRefresh) {
        analyticsService.track('page/leaderboard/contests');
        this.mode = 'contests';
        return this.contestList.refresh(forceRefresh);
    };
    LeaderboardsPage.prototype.displayFriendsLeaderboardTab = function () {
        analyticsService.track('page/leaderboard/friends');
        this.mode = 'friends';
        var forceRefresh = false;
        if (this.nextTimeForceRefreshFriends) {
            this.nextTimeForceRefreshFriends = false;
            forceRefresh = true;
        }
        this.showFriendsLeaderboard(forceRefresh).then(function () {
        }, function () {
        });
    };
    LeaderboardsPage.prototype.showFriendsLeaderboard = function (forceRefresh) {
        analyticsService.track('page/leaderboard/friends');
        this.mode = 'friends';
        return this.leadersComponent.showFriends(forceRefresh);
    };
    LeaderboardsPage.prototype.displayWeeklyLeaderboardTab = function () {
        analyticsService.track('page/leaderboard/weekly');
        this.mode = 'weekly';
        var forceRefresh = false;
        if (this.nextTimeForceRefreshWeekly) {
            this.nextTimeForceRefreshWeekly = false;
            forceRefresh = true;
        }
        this.showWeeklyLeaderboard(forceRefresh).then(function () {
        }, function () {
        });
    };
    LeaderboardsPage.prototype.showWeeklyLeaderboard = function (forceRefresh) {
        analyticsService.track('page/leaderboard/weekly');
        this.mode = 'weekly';
        return this.leadersComponent.showWeekly(forceRefresh);
    };
    LeaderboardsPage.prototype.refreshList = function (forceRefresh) {
        return this.contestList.refresh(forceRefresh);
    };
    LeaderboardsPage.prototype.doRefresh = function (refresher) {
        switch (this.mode) {
            case 'contests':
                this.contestList.refresh(true).then(function () {
                    refresher.complete();
                }, function () {
                    refresher.complete();
                });
                break;
            case 'friends':
                this.showFriendsLeaderboard(true).then(function () {
                    refresher.complete();
                }, function () {
                    refresher.complete();
                });
                break;
            case 'weekly':
                this.showWeeklyLeaderboard(true).then(function () {
                    refresher.complete();
                }, function () {
                    refresher.complete();
                });
                break;
        }
    };
    LeaderboardsPage.prototype.facebookLogin = function () {
        var _this = this;
        connectService.facebookLogin().then(function (connectInfo) {
            _this.client.upgradeGuest(connectInfo).then(function () {
                connectService.storeCredentials(connectInfo);
                //I am located at the friends tab - refresh since I just upgraded to facebook
                //Should immediatelly see my friends
                _this.showFriendsLeaderboard(true).then(function () {
                }, function () {
                });
            }, function () {
            });
        }, function () {
        });
    };
    __decorate([
        core_1.ViewChild(simple_tabs_1.SimpleTabsComponent), 
        __metadata('design:type', simple_tabs_1.SimpleTabsComponent)
    ], LeaderboardsPage.prototype, "simpleTabsComponent", void 0);
    __decorate([
        core_1.ViewChild(contest_list_1.ContestListComponent), 
        __metadata('design:type', contest_list_1.ContestListComponent)
    ], LeaderboardsPage.prototype, "contestList", void 0);
    __decorate([
        core_1.ViewChild(leaders_1.LeadersComponent), 
        __metadata('design:type', leaders_1.LeadersComponent)
    ], LeaderboardsPage.prototype, "leadersComponent", void 0);
    LeaderboardsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/leaderboards/leaderboards.html',
            directives: [simple_tabs_1.SimpleTabsComponent, simple_tab_1.SimpleTabComponent, contest_list_1.ContestListComponent, leaders_1.LeadersComponent]
        }), 
        __metadata('design:paramtypes', [])
    ], LeaderboardsPage);
    return LeaderboardsPage;
})();
exports.LeaderboardsPage = LeaderboardsPage;
//# sourceMappingURL=leaderboards.js.map