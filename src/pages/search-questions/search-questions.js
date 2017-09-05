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
var contestsService = require('../../providers/contests');
var analyticsService = require('../../providers/analytics');
var alertService = require('../../providers/alert');
var SearchQuestionsPage = (function () {
    function SearchQuestionsPage(params, viewController) {
        this.client = client_1.Client.getInstance();
        this.viewController = viewController;
        this.currentQuestions = params.data.currentQuestions;
        this.searchText = '';
    }
    //The only life cycle eve currently called in modals
    SearchQuestionsPage.prototype.ngAfterViewInit = function () {
        analyticsService.track('page/searchQuestions');
    };
    SearchQuestionsPage.prototype.search = function (event) {
        var _this = this;
        //Clear list if empty text
        if (!this.searchText || !(this.searchText.trim())) {
            this.questions = [];
            return;
        }
        var existingQuestionIds = [];
        if (this.currentQuestions && this.currentQuestions.visibleCount > 0) {
            for (var i = 0; i < this.currentQuestions.list.length; i++) {
                if (this.currentQuestions.list[i]._id && this.currentQuestions.list[i]._id !== 'new' && !this.currentQuestions.list[i].deleted) {
                    existingQuestionIds.push(this.currentQuestions.list[i]._id);
                }
            }
        }
        contestsService.searchMyQuestions(this.searchText, existingQuestionIds).then(function (questionsResult) {
            _this.questions = questionsResult;
        }, function () {
        });
    };
    SearchQuestionsPage.prototype.dismiss = function (applyChanges) {
        analyticsService.track('questions/search/' + (applyChanges ? 'select' : 'cancel'));
        if (applyChanges) {
            //Find how many selected
            var selectedCount = 0;
            for (var i = 0; i < this.questions.length; i++) {
                if (this.questions[i].checked) {
                    selectedCount++;
                }
            }
            //Check if max reached together with the current questions in the contest
            if (selectedCount > 0 && this.currentQuestions.visibleCount + selectedCount > this.client.settings['newContest'].privateQuestions.max) {
                alertService.alert(this.client.translate('MAX_USER_QUESTIONS_REACHED', { max: this.client.settings['newContest'].privateQuestions.max }));
                return;
            }
            for (var i = 0; i < this.questions.length; i++) {
                if (!this.questions[i].checked) {
                    continue;
                }
                var questionExist = false;
                for (var j = 0; j < this.currentQuestions.list.length; j++) {
                    //Check if question was marked as 'deleted', and now re-instated
                    if (this.questions[i]._id === this.currentQuestions.list[j]._id && this.currentQuestions.list[j].deleted) {
                        this.currentQuestions.list[j].deleted = false;
                        this.currentQuestions.visibleCount++;
                        questionExist = true;
                        break;
                    }
                }
                if (!questionExist) {
                    this.currentQuestions.visibleCount++;
                    this.currentQuestions.list.push(JSON.parse(JSON.stringify(this.questions[i])));
                }
            }
        }
        this.viewController.dismiss();
    };
    SearchQuestionsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/search-questions/search-questions.html'
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams, ionic_angular_1.ViewController])
    ], SearchQuestionsPage);
    return SearchQuestionsPage;
})();
exports.SearchQuestionsPage = SearchQuestionsPage;
//# sourceMappingURL=search-questions.js.map