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
var QuestionStatsPage = (function () {
    function QuestionStatsPage(params, viewController) {
        this.client = client_1.Client.getInstance();
        this.question = params.data.question;
        this.viewController = viewController;
    }
    QuestionStatsPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.resizeHandler = function () {
            if (_this.question.correctRatio || _this.question.correctRatio === 0) {
                _this.drawChart();
            }
        };
        this.client.events.subscribe('app:resize', this.resizeHandler);
    };
    QuestionStatsPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:resize', this.resizeHandler);
    };
    //The only life cycle eve currently called in modals
    QuestionStatsPage.prototype.ngAfterViewInit = function () {
        if (this.question.correctRatio || this.question.correctRatio === 0) {
            this.questionStatsCanvas = this.questionStatsCanvasElementRef.nativeElement;
            this.questionStatsContext = this.questionStatsCanvas.getContext('2d');
            this.correctRatioRounded = Math.round(this.question.correctRatio * 100);
        }
    };
    QuestionStatsPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/questionStats', { 'questionId': this.question._id });
        if (this.question.correctRatio || this.question.correctRatio === 0) {
            this.drawChart();
        }
    };
    QuestionStatsPage.prototype.drawChart = function () {
        this.questionStatsCanvas.width = this.client.width * this.client.settings.charts.questionStats.size.widthRatio;
        this.questionStatsCanvas.height = this.client.height * this.client.settings.charts.questionStats.size.heightRatio;
        var radius;
        if (this.questionStatsCanvas.width < this.questionStatsCanvas.height) {
            radius = (this.questionStatsCanvas.width / 2) * this.client.settings.charts.questionStats.size.radiusRatio;
        }
        else {
            radius = (this.questionStatsCanvas.height / 2) * this.client.settings.charts.questionStats.size.radiusRatio;
        }
        if (this.question.correctRatio === 1) {
            //Draw full correct ratio
            this.drawQuestionStatsCircle(radius, this.client.settings.charts.questionStats.colors.correct, -Math.PI / 2, Math.PI * 2 - Math.PI / 2, false);
        }
        else if (this.question.correctRatio === 0) {
            //Draw full incorrect ratio
            this.drawQuestionStatsCircle(radius, this.client.settings.charts.questionStats.colors.incorrect, -Math.PI / 2, Math.PI * 2 - Math.PI / 2, false);
        }
        else {
            this.drawQuestionStatsCircle(radius, this.client.settings.charts.questionStats.colors.correct, -Math.PI / 2, this.question.correctRatio * Math.PI * 2 - Math.PI / 2, false);
            this.drawQuestionStatsCircle(radius, this.client.settings.charts.questionStats.colors.incorrect, this.question.correctRatio * Math.PI * 2 - Math.PI / 2, -Math.PI / 2, false);
        }
        //Draw the inner circle in white - to make a doughnut
        this.drawQuestionStatsCircle(radius * this.client.settings.charts.questionStats.size.innerDoughnutRadiusRatio, this.client.settings.charts.questionStats.colors.innerDoughnut);
    };
    QuestionStatsPage.prototype.dismiss = function (action) {
        analyticsService.track('quiz/stats/' + (action ? action : 'cancel'));
        this.viewController.dismiss(action);
    };
    QuestionStatsPage.prototype.drawQuestionStatsCircle = function (radius, color, startAngle, endAngle, counterClockwise) {
        if (startAngle == undefined) {
            startAngle = 0;
        }
        if (endAngle == undefined) {
            endAngle = Math.PI * 2;
        }
        if (counterClockwise == undefined) {
            counterClockwise = false;
        }
        var x = this.questionStatsCanvas.width / 2;
        var y = this.questionStatsCanvas.height / 2;
        this.questionStatsContext.beginPath();
        this.questionStatsContext.fillStyle = color;
        this.questionStatsContext.moveTo(x, y);
        this.questionStatsContext.arc(x, y, radius, startAngle, endAngle, counterClockwise);
        this.questionStatsContext.fill();
        this.questionStatsContext.closePath();
    };
    __decorate([
        core_1.ViewChild("questionStatsCanvas"), 
        __metadata('design:type', core_1.ElementRef)
    ], QuestionStatsPage.prototype, "questionStatsCanvasElementRef", void 0);
    QuestionStatsPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/question-stats/question-stats.html'
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams, ionic_angular_1.ViewController])
    ], QuestionStatsPage);
    return QuestionStatsPage;
})();
exports.QuestionStatsPage = QuestionStatsPage;
//# sourceMappingURL=question-stats.js.map