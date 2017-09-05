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
var analyticsService = require('../../providers/analytics');
var ContestTypePage = (function () {
    function ContestTypePage(viewController) {
        this.client = client_1.Client.getInstance();
        this.viewController = viewController;
    }
    //The only life cycle event currently called in modals
    ContestTypePage.prototype.ngAfterViewInit = function () {
        analyticsService.track('page/contestType');
    };
    ContestTypePage.prototype.selectContestContent = function (contestTypeId) {
        if (contestTypeId && this.client.settings.newContest.contestTypes[contestTypeId].disabled) {
            return;
        }
        analyticsService.track('newContest/type/' + (contestTypeId ? contestTypeId : 'cancel'));
        this.viewController.dismiss(contestTypeId);
    };
    ContestTypePage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/contest-type/contest-type.html'
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.ViewController])
    ], ContestTypePage);
    return ContestTypePage;
})();
exports.ContestTypePage = ContestTypePage;
//# sourceMappingURL=contest-type.js.map