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
var animation_listener_1 = require('../../directives/animation-listener/animation-listener');
var transition_listener_1 = require('../../directives/transition-listener/transition-listener');
var client_1 = require('../../providers/client');
var contestsService = require('../../providers/contests');
var quizService = require('../../providers/quiz');
var soundService = require('../../providers/sound');
var analyticsService = require('../../providers/analytics');
var alertService = require('../../providers/alert');
var objects_1 = require('../../objects/objects');
var QuizPage = (function () {
    function QuizPage(params) {
        this.questionHistory = [];
        this.pageInitiated = false;
        this.quizStarted = false;
        this.client = client_1.Client.getInstance();
        this.params = params;
        if (this.params.data.contest.leadingTeam === -1) {
            this.title = this.client.translate('TIE');
        }
        else {
            this.title = this.client.translate('QUIZ_VIEW_TITLE', { 'team': this.params.data.contest.teams[this.params.data.contest.leadingTeam].name });
        }
    }
    QuizPage.prototype.ionViewLoaded = function () {
        var _this = this;
        this.resizeHandler = function () {
            _this.drawQuizProgress();
        };
        this.client.events.subscribe('app:resize', this.resizeHandler);
    };
    QuizPage.prototype.ionViewWillUnload = function () {
        this.client.events.unsubscribe('app:resize', this.resizeHandler);
    };
    QuizPage.prototype.ngAfterViewInit = function () {
        this.quizCanvas = this.quizCanvasElementRef.nativeElement;
        this.quizContext = this.quizCanvas.getContext('2d');
    };
    QuizPage.prototype.ionViewWillEnter = function () {
        analyticsService.track('page/quiz', { 'contestId': this.params.data.contest._id });
        this.startQuiz();
    };
    QuizPage.prototype.startQuiz = function () {
        var _this = this;
        if (this.quizStarted) {
            //could happen if view is cached or returning from questionStats
            return;
        }
        this.clearQuizProgress(); //From previous time
        analyticsService.track('quiz/started', {
            'source': this.params.data.source,
            'typeId': this.params.data.contest.type.id
        });
        quizService.start(this.params.data.contest._id).then(function (data) {
            _this.quizStarted = true;
            _this.quizData = data.quiz;
            _this.quizData.currentQuestion.answered = false;
            var radius = _this.quizCanvas.width / (2 * data.quiz.totalQuestions + (data.quiz.totalQuestions - 1) * _this.client.settings.quiz.canvas.circle.radius.spaceRatio);
            if (radius > _this.client.settings.quiz.canvas.circle.radius.max) {
                radius = _this.client.settings.quiz.canvas.circle.radius.max;
            }
            else if (radius < _this.client.settings.quiz.canvas.circle.radius.min) {
                radius = _this.client.settings.quiz.canvas.circle.radius.min;
            }
            _this.circleOuterRadius = radius;
            _this.circleInnerRadius = _this.circleOuterRadius * (1 - _this.client.settings.quiz.canvas.circle.radius.outerBorderRatio);
            for (var i = 0; i < data.quiz.totalQuestions; i++) {
                var score;
                if (_this.params.data.contest.type.id === 'systemTrivia') {
                    //System Trivia
                    score = _this.client.settings.quiz.questions[_this.params.data.contest.type.id].scores[i];
                }
                else if (_this.params.data.contest.type.id === 'userTrivia') {
                    //User Trivia
                    score = _this.client.settings.quiz.questions[_this.params.data.contest.type.id].questionScore;
                }
                else {
                    score = 0;
                }
                _this.questionHistory.push(new objects_1.QuizQuestion(score));
            }
            _this.drawQuizProgress();
            if (_this.quizData.reviewMode && _this.quizData.reviewMode.reason) {
                alertService.alert(_this.client.translate(_this.quizData.reviewMode.reason)).then(function () {
                }, function () {
                });
            }
        }, function (err) {
            switch (err.type) {
                case 'SERVER_ERROR_GENERAL':
                    _this.client.nav.pop();
                    break;
                case 'SERVER_ERROR_CONTEST_ENDED':
                    //additionalInfo contains the updated contest object from the server
                    contestsService.setContestClientData(err.additionalInfo.contest);
                    setTimeout(function () {
                        _this.client.nav.pop().then(function () {
                            console.log('quiz pop completed');
                            _this.client.events.publish('app:contestUpdated', err.additionalInfo.contest, _this.params.data.contest.status, err.additionalInfo.contest.status);
                            console.log('quiz results published to contest');
                        }, function () {
                        });
                    }, 1000);
                    break;
                default:
                    //Allow the user to answer again - probably timeout error
                    _this.quizData.currentQuestion.answered = false;
                    break;
            }
        });
    };
    QuizPage.prototype.submitAnswer = function (answerId) {
        var _this = this;
        this.quizData.currentQuestion.answered = true;
        quizService.answer(answerId, this.questionHistory[this.quizData.currentQuestionIndex].hintUsed, this.questionHistory[this.quizData.currentQuestionIndex].answerUsed).then(function (data) {
            var correctAnswerId;
            _this.questionHistory[_this.quizData.currentQuestionIndex].answered = data.question.correct;
            if (data.results) {
                //Will get here when quiz is finished
                _this.quizData.results = data.results;
            }
            //Rank might change during quiz - and feature might open
            if (data.features) {
                _this.client.session.features = data.features;
            }
            if (data.xpProgress) {
                _this.quizData.xpProgress = data.xpProgress;
            }
            else {
                _this.quizData.xpProgress = null;
            }
            if (data.question.correct) {
                analyticsService.track('quiz/question' + (_this.quizData.currentQuestionIndex + 1) + '/answered/correct');
                correctAnswerId = answerId;
                _this.quizData.currentQuestion.answers[answerId].answeredCorrectly = true;
                soundService.play('audio/click_ok');
            }
            else {
                analyticsService.track('quiz/question' + (_this.quizData.currentQuestionIndex + 1) + '/answered/incorrect');
                soundService.play('audio/click_wrong');
                correctAnswerId = data.question.correctAnswerId;
                _this.quizData.currentQuestion.answers[answerId].answeredCorrectly = false;
                setTimeout(function () {
                    _this.quizData.currentQuestion.answers[data.question.correctAnswerId].correct = true;
                }, _this.client.settings.quiz.question.wrongAnswerMillisecondsDelay);
            }
            _this.correctButtonName = 'buttonAnswer' + correctAnswerId;
        }, function (err) {
            switch (err.type) {
                case 'SERVER_ERROR_SESSION_EXPIRED_DURING_QUIZ':
                    _this.startQuiz();
                    break;
                case 'SERVER_ERROR_GENERAL':
                    _this.client.nav.pop();
                    break;
                default:
                    //Allow the user to answer again - probably timeout error
                    _this.quizData.currentQuestion.answered = false;
                    break;
            }
        });
    };
    QuizPage.prototype.nextQuestion = function () {
        var _this = this;
        quizService.nextQuestion().then(function (data) {
            _this.quizData = data;
            _this.quizData.currentQuestion.answered = false;
            _this.quizData.currentQuestion.doAnimation = true; //Animation end will trigger quiz proceed
            _this.drawQuizProgress();
            analyticsService.track('quiz/gotQuestion' + (_this.quizData.currentQuestionIndex + 1));
        }, function () {
        });
    };
    QuizPage.prototype.questionTransitionEnd = function () {
        if (this.quizData && this.quizData.currentQuestion) {
            this.quizData.currentQuestion.doAnimation = false; //Animation end will trigger quiz proceed
        }
    };
    QuizPage.prototype.buttonAnimationEnded = function (event) {
        var _this = this;
        if (this.quizData.xpProgress && this.quizData.xpProgress.addition > 0) {
            this.client.playerInfoComponent.addXp(this.quizData.xpProgress).then(function () {
                if (_this.correctButtonName === event.srcElement['name']) {
                    if (!_this.quizData.xpProgress.rankChanged) {
                        _this.quizProceed();
                    }
                    else {
                        var modal = _this.client.createModalPage('NewRankPage', {
                            'xpProgress': _this.quizData.xpProgress
                        });
                        modal.onDidDismiss(function (okPressed) {
                            _this.quizProceed();
                        });
                        modal.present();
                    }
                }
            }, function () {
            });
        }
        else if (this.correctButtonName === event.srcElement['name']) {
            this.quizProceed();
        }
    };
    QuizPage.prototype.quizProceed = function () {
        var _this = this;
        if (this.quizData.finished) {
            this.drawQuizProgress();
            this.client.session.score += this.quizData.results.data.score;
            analyticsService.track('quiz/finished', {
                'score': '' + this.quizData.results.data.score,
                'message': this.quizData.results.data.clientKey
            });
            //Give enough time to draw the circle progress of the last question
            setTimeout(function () {
                _this.client.nav.pop().then(function () {
                    _this.client.events.publish('app:quizFinished', _this.quizData.results);
                    //For next time if view remains cached
                    _this.quizStarted = false;
                }, function () {
                });
            }, 1000);
        }
        else {
            this.nextQuestion();
        }
    };
    QuizPage.prototype.canvasClick = function (event) {
        var _this = this;
        if (this.currentQuestionCircle &&
            event.offsetX <= this.currentQuestionCircle.right &&
            event.offsetX >= this.currentQuestionCircle.left &&
            event.offsetY >= this.currentQuestionCircle.top &&
            event.offsetY <= this.currentQuestionCircle.bottom) {
            if (this.quizData.currentQuestion.correctRatio ||
                this.quizData.currentQuestion.correctRatio === 0 ||
                this.quizData.currentQuestion.wikipediaHint ||
                this.quizData.currentQuestion.wikipediaAnswer) {
                var modal = this.client.createModalPage('QuestionStatsPage', {
                    'question': this.quizData.currentQuestion
                });
                modal.onDidDismiss(function (action) {
                    switch (action) {
                        case 'hint':
                            _this.questionHistory[_this.quizData.currentQuestionIndex].hintUsed = true;
                            _this.questionHistory[_this.quizData.currentQuestionIndex].score -= _this.quizData.currentQuestion.hintCost;
                            _this.drawQuizScores();
                            window.open(_this.client.currentLanguage.wiki + _this.quizData.currentQuestion.wikipediaHint, '_system', 'location=yes');
                            break;
                        case 'answer':
                            _this.questionHistory[_this.quizData.currentQuestionIndex].answerUsed = true;
                            _this.questionHistory[_this.quizData.currentQuestionIndex].score -= _this.quizData.currentQuestion.answerCost;
                            _this.drawQuizScores();
                            window.open(_this.client.currentLanguage.wiki + _this.quizData.currentQuestion.wikipediaAnswer, '_system', 'location=yes');
                            break;
                    }
                });
                modal.present();
            }
        }
    };
    QuizPage.prototype.drawQuizProgress = function () {
        this.quizCanvas.width = this.client.width * this.client.settings.quiz.canvas.size.widthRatio;
        //Draw connecting line
        this.quizContext.beginPath();
        this.quizContext.moveTo(0, this.circleOuterRadius + this.client.settings.quiz.canvas.size.topOffset);
        this.quizContext.lineTo(this.quizCanvas.width, this.circleOuterRadius + this.client.settings.quiz.canvas.size.topOffset);
        this.quizContext.lineWidth = this.client.settings.quiz.canvas.line.width;
        this.quizContext.strokeStyle = this.client.settings.quiz.canvas.line.color;
        this.quizContext.stroke();
        this.quizContext.fill();
        this.quizContext.closePath();
        //Set the initial X to draw
        var currentX;
        if (this.client.currentLanguage.direction === 'ltr') {
            currentX = this.circleOuterRadius;
        }
        else {
            currentX = this.quizCanvas.width - this.circleOuterRadius;
        }
        this.currentQuestionCircle = null;
        //Calculate the space between the circles depending on the number of questions
        var circleOffsets = (this.quizCanvas.width - this.quizData.totalQuestions * this.circleOuterRadius * 2) / (this.quizData.totalQuestions - 1);
        for (var i = 0; i < this.quizData.totalQuestions; i++) {
            if (i === this.quizData.currentQuestionIndex && this.questionHistory[i].answered == undefined) {
                //--------------------------------------------------------------------//
                // Current question (to be answered)
                //--------------------------------------------------------------------//
                //Current circle is clickable to get question stats
                this.currentQuestionCircle = {
                    'top': this.client.settings.quiz.canvas.size.topOffset,
                    'left': currentX - this.circleOuterRadius,
                    'bottom': this.client.settings.quiz.canvas.size.topOffset + 2 * this.circleOuterRadius,
                    'right': currentX + this.circleOuterRadius
                };
                //Current question has statistics about success ratio
                if (this.quizData.currentQuestion.correctRatio || this.quizData.currentQuestion.correctRatio === 0) {
                    //Draw the outer circle
                    this.drawQuestionCircle(currentX, this.circleOuterRadius, this.client.settings.quiz.canvas.circle.states.current.stats.outerColor);
                    if (this.quizData.currentQuestion.correctRatio === 1) {
                        //Draw full correct ratio (in the inner circle - partial arc)
                        this.drawQuestionCircle(currentX, this.circleInnerRadius, this.client.settings.quiz.canvas.circle.states.previous.correct.innerColor, -Math.PI / 2, Math.PI * 2 - Math.PI / 2, false);
                    }
                    else if (this.quizData.currentQuestion.correctRatio === 0) {
                        //Draw full incorrect ratio (in the inner circle - partial arc)
                        this.drawQuestionCircle(currentX, this.circleInnerRadius, this.client.settings.quiz.canvas.circle.states.previous.incorrect.innerColor, -Math.PI / 2, Math.PI * 2 - Math.PI / 2, false);
                    }
                    else {
                        this.drawQuestionCircle(currentX, this.circleInnerRadius, this.client.settings.quiz.canvas.circle.states.previous.correct.innerColor, -Math.PI / 2, this.quizData.currentQuestion.correctRatio * Math.PI * 2 - Math.PI / 2, false);
                        this.drawQuestionCircle(currentX, this.circleInnerRadius, this.client.settings.quiz.canvas.circle.states.previous.incorrect.innerColor, this.quizData.currentQuestion.correctRatio * Math.PI * 2 - Math.PI / 2, -Math.PI / 2, false);
                    }
                }
                else {
                    //Draw the "current" circle using the "noStats" state
                    this.drawQuestionState(currentX, this.client.settings.quiz.canvas.circle.states.current.noStats);
                }
            }
            else if (i > this.quizData.currentQuestionIndex && this.questionHistory[i].answered == undefined) {
                //--------------------------------------------------------------------//
                // Next Question - not reached yet
                //--------------------------------------------------------------------//
                this.drawQuestionState(currentX, this.client.settings.quiz.canvas.circle.states.next);
            }
            else {
                //--------------------------------------------------------------------//
                // Previous Question - already answered
                //--------------------------------------------------------------------//
                //Draw correct/incorrect for answered
                if (this.questionHistory[i].answered != undefined) {
                    if (this.questionHistory[i].answered) {
                        this.drawQuestionState(currentX, this.client.settings.quiz.canvas.circle.states.previous.correct);
                    }
                    else {
                        this.drawQuestionState(currentX, this.client.settings.quiz.canvas.circle.states.previous.incorrect);
                    }
                }
            }
            //--------------------------------------------------------------------//
            // Move the X offset to the next circle
            //--------------------------------------------------------------------//
            if (this.client.currentLanguage.direction === 'ltr') {
                if (i < this.quizData.totalQuestions - 1) {
                    currentX += circleOffsets + this.circleOuterRadius * 2;
                }
                else {
                    currentX = this.quizCanvas.width - this.circleOuterRadius;
                }
            }
            else {
                if (i < this.quizData.totalQuestions - 1) {
                    currentX = currentX - circleOffsets - (this.circleOuterRadius * 2);
                }
                else {
                    currentX = this.circleOuterRadius;
                }
            }
        }
        this.drawQuizScores();
    };
    QuizPage.prototype.drawQuestionCircle = function (x, radius, color, startAngle, endAngle, counterClockwise) {
        if (startAngle == undefined) {
            startAngle = 0;
        }
        if (endAngle == undefined) {
            endAngle = Math.PI * 2;
        }
        if (counterClockwise == undefined) {
            counterClockwise = false;
        }
        this.quizContext.beginPath();
        this.quizContext.fillStyle = color;
        this.quizContext.moveTo(x, this.circleOuterRadius + this.client.settings.quiz.canvas.size.topOffset);
        this.quizContext.arc(x, this.circleOuterRadius + this.client.settings.quiz.canvas.size.topOffset, radius, startAngle, endAngle, counterClockwise);
        this.quizContext.fill();
        this.quizContext.closePath();
    };
    QuizPage.prototype.drawQuestionState = function (x, state) {
        this.drawQuestionCircle(x, this.circleOuterRadius, state.outerColor);
        if (state.innerColor) {
            this.drawQuestionCircle(x, this.circleInnerRadius, state.innerColor);
        }
        if (state.text) {
            this.quizContext.beginPath();
            this.quizContext.fillStyle = state.textFillStyle;
            this.quizContext.font = this.getCanvasFont(this.client.settings.quiz.canvas.font.signs.bold, this.circleOuterRadius + 'px', this.client.settings.quiz.canvas.font.signs.name);
            var textWidth = this.quizContext.measureText(state.text).width;
            var directionMultiplier = 1;
            if (this.client.currentLanguage.direction === 'ltr') {
                //For left to right - need to draw "behind" the x supplied, for rtl - "after"
                directionMultiplier = -1;
            }
            //1.35 = 'magic number' - works for all resolutions
            this.quizContext.fillText(state.text, x + (directionMultiplier * textWidth / 2), this.client.settings.quiz.canvas.size.topOffset + (1.35 * this.circleOuterRadius));
            this.quizContext.closePath();
        }
    };
    QuizPage.prototype.clearQuizScores = function () {
        this.quizContext.clearRect(0, 0, this.quizCanvas.width, this.client.settings.quiz.canvas.scores.size.top);
    };
    QuizPage.prototype.clearQuizProgress = function () {
        this.quizContext.clearRect(0, 0, this.quizCanvas.width, this.quizCanvas.height);
    };
    QuizPage.prototype.drawQuizScores = function () {
        this.clearQuizScores();
        this.quizContext.font = this.getCanvasFont(this.client.settings.quiz.canvas.font.scores.bold, this.client.settings.quiz.canvas.font.scores.size, this.client.settings.quiz.canvas.font.scores.name);
        var currentX;
        var directionMultiplier = 1;
        if (this.client.currentLanguage.direction === 'ltr') {
            currentX = this.circleOuterRadius;
            directionMultiplier = -1;
        }
        else {
            currentX = this.quizCanvas.width - this.circleOuterRadius;
        }
        var circleOffsets = 0;
        if (this.quizData.totalQuestions > 1) {
            circleOffsets = (this.quizCanvas.width - this.quizData.totalQuestions * this.circleOuterRadius * 2) / (this.quizData.totalQuestions - 1);
        }
        for (var i = 0; i < this.quizData.totalQuestions; i++) {
            var questionScore;
            if (!this.quizData.reviewMode) {
                questionScore = '' + this.questionHistory[i].score;
            }
            else {
                questionScore = '';
            }
            //Draw question score
            var textWidth = this.quizContext.measureText(questionScore).width;
            var scoreColor = this.client.settings.quiz.canvas.scores.colors.default;
            if (this.questionHistory[i].answered && !this.questionHistory[i].answerUsed) {
                scoreColor = this.client.settings.quiz.canvas.scores.colors.correct;
            }
            //Draw the score at the top of the circle
            this.quizContext.beginPath();
            this.quizContext.fillStyle = scoreColor;
            this.quizContext.fillText(questionScore, currentX + directionMultiplier * textWidth / 2, this.client.settings.quiz.canvas.scores.size.top);
            this.quizContext.closePath();
            if (this.client.currentLanguage.direction === 'ltr') {
                if (i < this.quizData.totalQuestions - 1) {
                    currentX += circleOffsets + this.circleOuterRadius * 2;
                }
                else {
                    currentX = this.quizCanvas.width - this.circleOuterRadius;
                }
            }
            else {
                if (i < this.quizData.totalQuestions - 1) {
                    currentX = currentX - circleOffsets - (this.circleOuterRadius * 2);
                }
                else {
                    currentX = this.circleOuterRadius;
                }
            }
        }
    };
    QuizPage.prototype.openQuestionEditor = function () {
        var _this = this;
        var question = {
            '_id': this.quizData.currentQuestion._id,
            'text': this.quizData.currentQuestion.text,
            'answers': []
        };
        for (var i = 0; i < this.quizData.currentQuestion.answers.length; i++) {
            question.answers[this.quizData.currentQuestion.answers[i].originalIndex] = this.quizData.currentQuestion.answers[i].text;
        }
        var modal = this.client.createModalPage('QuestionEditorPage', { 'question': question, 'mode': 'edit' });
        modal.onDidDismiss(function (result) {
            if (!result) {
                return;
            }
            quizService.setQuestionByAdmin(result.question).then(function () {
                _this.quizData.currentQuestion.text = result.question.text;
                for (var i = 0; i < result.question.answers.length; i++) {
                    _this.quizData.currentQuestion.answers[i].text = result.question.answers[_this.quizData.currentQuestion.answers[i].originalIndex];
                }
            }, function () {
            });
        });
        modal.present();
    };
    QuizPage.prototype.share = function () {
        this.client.share(this.params.data.contest, 'quiz');
    };
    QuizPage.prototype.getCanvasFont = function (bold, size, name) {
        var font = '';
        if (bold) {
            font += 'bold ';
        }
        font += size + ' ' + name;
        return font;
    };
    __decorate([
        core_1.ViewChild('quizCanvas'), 
        __metadata('design:type', core_1.ElementRef)
    ], QuizPage.prototype, "quizCanvasElementRef", void 0);
    QuizPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/quiz/quiz.html',
            directives: [animation_listener_1.AnimationListener, transition_listener_1.TransitionListener]
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams])
    ], QuizPage);
    return QuizPage;
})();
exports.QuizPage = QuizPage;
//# sourceMappingURL=quiz.js.map