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
var contest_list_1 = require('../../components/contest-list/contest-list');
var client_1 = require('../../providers/client');
var analyticsService = require('../../providers/analytics');
var MyContestsPage = (function () {
    function MyContestsPage() {
        this.client = client_1.Client.getInstance();
    }
    MyContestsPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.updateContestHandler = function (eventData) {
            _this.contestList.updateContest(eventData[0]);
        };
        this.removeContestHandler = function (eventData) {
            _this.contestList.removeContest(eventData[0]);
        };
        this.forceRefreshHandler = function () {
            _this.refreshList(true).then(function () {
            }, function () {
            });
        };
        this.client.events.subscribe('app:myContests:contestUpdated', this.updateContestHandler);
        this.client.events.subscribe('app:myContests:contestRemoved', this.removeContestHandler);
        this.client.events.subscribe('app:myContests:forceRefresh', this.forceRefreshHandler);
    };
    MyContestsPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:myContests:contestUpdated', this.updateContestHandler);
        this.client.events.unsubscribe('app:myContests:contestRemoved', this.removeContestHandler);
        this.client.events.unsubscribe('app:myContests:forceRefresh', this.forceRefreshHandler);
    };
    MyContestsPage.prototype.ionViewWillEnter = function () {
        var _this = this;
        analyticsService.track('page/myContests');
        this.refreshList().then(function () {
            if (_this.contestList.contests.length === 0 && !_this.pageLoaded) {
                //On load only - switch to "running contests" if no personal contests
                _this.client.events.publish('app:noPersonalContests');
            }
            _this.pageLoaded = true;
        }, function () {
        });
    };
    MyContestsPage.prototype.refreshList = function (forceRefresh) {
        return this.contestList.refresh(forceRefresh);
    };
    MyContestsPage.prototype.doRefresh = function (refresher) {
        this.refreshList(true).then(function () {
            refresher.complete();
        }, function () {
            refresher.complete();
        });
    };
    MyContestsPage.prototype.showLeadingContests = function () {
        this.client.events.publish('app:showLeadingContests');
    };
    __decorate([
        core_1.ViewChild(contest_list_1.ContestListComponent), 
        __metadata('design:type', contest_list_1.ContestListComponent)
    ], MyContestsPage.prototype, "contestList", void 0);
    MyContestsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/my-contests/my-contests.html',
            directives: [contest_list_1.ContestListComponent]
        }), 
        __metadata('design:paramtypes', [])
    ], MyContestsPage);
    return MyContestsPage;
})();
exports.MyContestsPage = MyContestsPage;
//# sourceMappingURL=my-contests.js.map