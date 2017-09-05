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
var forms_1 = require('@angular/forms');
var ionic_angular_1 = require('ionic-angular');
var date_picker_1 = require('../../components/date-picker/date-picker');
var client_1 = require('../../providers/client');
var analyticsService = require('../../providers/analytics');
var contestsService = require('../../providers/contests');
var paymentService = require('../../providers/payments');
var alertService = require('../../providers/alert');
var objects_1 = require('../../objects/objects');
var SetContestPage = (function () {
    function SetContestPage(params) {
        var _this = this;
        this.client = client_1.Client.getInstance();
        this.params = params;
        this.endOptionKeys = Object.keys(this.client.settings.newContest.endOptions);
        //Start date is today, end date is by default as set by the server
        var nowWithTime = new Date();
        var nowWithoutTime = new Date();
        nowWithoutTime.clearTime();
        this.currentTimeOnlyInMilliseconds = nowWithTime.getTime() - nowWithoutTime.getTime();
        this.nowWithoutTimeEpoch = nowWithoutTime.getTime();
        var endOption = '';
        if (this.params.data.mode === 'edit') {
            this.contestLocalCopy = contestsService.cloneForEdit(this.params.data.contest);
            if (this.contestLocalCopy.type.id === 'userTrivia') {
                this.retrieveUserQuestions();
            }
        }
        else if (this.params.data.mode === 'add') {
            for (var i = 0; i < this.endOptionKeys.length; i++) {
                if (this.client.settings.newContest.endOptions[this.endOptionKeys[i]].isDefault) {
                    endOption = this.endOptionKeys[i];
                    break;
                }
            }
            if (!endOption) {
                //If no default - set the last as default
                endOption = this.endOptionKeys[this.endOptionKeys.length - 1];
            }
            this.contestLocalCopy = new objects_1.Contest(this.params.data.typeId, this.nowWithoutTimeEpoch + this.currentTimeOnlyInMilliseconds, null, endOption);
            //Set contest subject
            this.contestLocalCopy.subject = this.client.translate(this.client.settings.newContest.contestTypes[this.contestLocalCopy.type.id].text.name, { 'name': this.client.session.name });
            //Set user questions
            if (this.contestLocalCopy.type.id === 'userTrivia') {
                this.contestLocalCopy.type.questions = new objects_1.Questions();
            }
        }
        //Init form
        this.contestForm = new forms_1.FormGroup({
            teams: new forms_1.FormGroup({
                team0: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.newContest.inputs.team.maxLength)]),
                team1: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.newContest.inputs.team.maxLength)]),
            }, null, this.matchingTeamsValidator),
            subject: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.newContest.inputs.subject.maxLength)]),
            endOption: new forms_1.FormControl(endOption),
            randomOrder: new forms_1.FormControl(false)
        });
        this.client.session.features['newContest'].purchaseData.retrieved = false;
        //-------------------------------------------------------------------------------------------------------------
        //Android Billing
        //-------------------------------------------------------------------------------------------------------------
        if (this.client.user.clientInfo.platform === 'android' && this.client.session.features['newContest'].locked) {
            if (!this.client.session.features['newContest'].purchaseData.retrieved) {
                //-------------------------------------------------------------------------------------------------------------
                //pricing - replace cost/currency with the google store pricing (local currency, etc.)
                //-------------------------------------------------------------------------------------------------------------
                window.inappbilling.getProductDetails(function (products) {
                    //In android - the price already contains the symbol
                    _this.client.session.features['newContest'].purchaseData.formattedCost = products[0].price;
                    _this.client.session.features['newContest'].purchaseData.cost = products[0].price_amount_micros / 1000000;
                    _this.client.session.features['newContest'].purchaseData.currency = products[0].price_currency_code;
                    _this.client.session.features['newContest'].purchaseData.retrieved = true;
                    //-------------------------------------------------------------------------------------------------------------
                    //Retrieve unconsumed items - and checking if user has an unconsumed 'new contest unlock key'
                    //-------------------------------------------------------------------------------------------------------------
                    window.inappbilling.getPurchases(function (unconsumedItems) {
                        if (unconsumedItems && unconsumedItems.length > 0) {
                            for (var i = 0; i < unconsumedItems.length; i++) {
                                if (unconsumedItems[i].productId === _this.client.session.features['newContest'].purchaseData.productId) {
                                    _this.processAndroidPurchase(unconsumedItems[i]);
                                    break;
                                }
                            }
                        }
                    }, function (error) {
                        analyticsService.logError('AndroidBillingRetrieveUnconsumedItems', error);
                    });
                }, function (msg) {
                    analyticsService.logError('AndroidBillingProductDetailsError', msg);
                }, this.client.session.features['newContest'].purchaseData.productId);
            }
        }
        else {
            this.client.session.features['newContest'].purchaseData.retrieved = true;
        }
    }
    SetContestPage.prototype.ngAfterViewInit = function () {
        this.team0Input['_native']._elementRef.nativeElement.maxLength = this.client.settings.newContest.inputs.team.maxLength;
        this.team1Input['_native']._elementRef.nativeElement.maxLength = this.client.settings.newContest.inputs.team.maxLength;
        this.subjectInput['_native']._elementRef.nativeElement.maxLength = this.client.settings.newContest.inputs.subject.maxLength;
        if (this.contestLocalCopy.type.id === 'systemTrivia' && !this.client.session.isAdmin) {
            this.subjectInput['_native']._elementRef.nativeElement.readOnly = true;
        }
    };
    SetContestPage.prototype.ionViewWillEnter = function () {
        var eventData = { 'mode': this.params.data.mode };
        if (this.params.data.mode === 'edit') {
            eventData['contestId'] = this.params.data.contest._id;
        }
        analyticsService.track('page/setContest', eventData);
        this.submitted = false;
    };
    SetContestPage.prototype.retrieveUserQuestions = function () {
        var _this = this;
        contestsService.getQuestions(this.contestLocalCopy.type.userQuestions).then(function (questions) {
            _this.contestLocalCopy.type.questions = { 'visibleCount': questions.length, 'list': questions };
        }, function () {
        });
    };
    SetContestPage.prototype.processAndroidPurchase = function (purchaseData) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var extraPurchaseData = {
                'actualCost': _this.client.session.features['newContest'].purchaseData.cost,
                'actualCurrency': _this.client.session.features['newContest'].purchaseData.currency,
                'featurePurchased': _this.client.session.features['newContest'].name
            };
            paymentService.processPayment('android', purchaseData, extraPurchaseData).then(function (serverPurchaseData) {
                _this.client.showLoader();
                window.inappbilling.consumePurchase(function (purchaseData) {
                    _this.client.hideLoader();
                    if (resolve) {
                        resolve(purchaseData);
                    }
                    paymentService.showPurchaseSuccess(serverPurchaseData);
                }, function (error) {
                    _this.client.hideLoader();
                    analyticsService.logError('AndroidBillingConsumeProductError', error);
                    if (reject) {
                        reject();
                    }
                }, purchaseData.productId);
            }, function () {
            });
        });
    };
    SetContestPage.prototype.buyNewContestUnlockKey = function (isMobile) {
        var _this = this;
        debugger;
        this.buyInProgress = true;
        paymentService.buy(this.client.session.features['newContest'], isMobile).then(function (result) {
            switch (result.method) {
                case 'paypal':
                    location.replace(result.data.url);
                    break;
                case 'facebook':
                    if (result.data.status === 'completed') {
                        paymentService.processPayment(result.method, result.data, null).then(function (serverPurchaseData) {
                            //Update local assets
                            _this.buyInProgress = false;
                            paymentService.showPurchaseSuccess(serverPurchaseData);
                        }, function () {
                            _this.buyInProgress = false;
                        });
                    }
                    else if (result.data.status === 'initiated') {
                        //Payment might come later from server
                        alertService.alert({ 'type': 'SERVER_ERROR_PURCHASE_IN_PROGRESS' });
                    }
                    else {
                        //Probably user canceled
                        _this.buyInProgress = false;
                    }
                    break;
                case 'android':
                    _this.processAndroidPurchase(result.data).then(function () {
                        _this.buyInProgress = false;
                    }, function () {
                        _this.buyInProgress = false;
                    });
                    break;
            }
        }, function () {
            _this.buyInProgress = false;
        });
    };
    SetContestPage.prototype.userQuestionsMinimumError = function () {
        if (this.userQuestionsInvalid) {
            return true;
        }
        else {
            return false;
        }
    };
    SetContestPage.prototype.maxQuestionsReached = function () {
        return (this.contestLocalCopy.type.questions && this.contestLocalCopy.type.questions.visibleCount === this.client.settings['newContest'].privateQuestions.max);
    };
    SetContestPage.prototype.openQuestionEditor = function (mode, question) {
        var _this = this;
        if (mode === 'add') {
            if (this.maxQuestionsReached()) {
                alertService.alert(this.client.translate('MAX_USER_QUESTIONS_REACHED', { max: this.client.settings['newContest'].privateQuestions.max }));
                return;
            }
        }
        var modal = this.client.createModalPage('QuestionEditorPage', {
            'question': question,
            'mode': mode,
            'currentQuestions': this.contestLocalCopy.type.questions
        });
        modal.onDidDismiss(function (result) {
            if (!result) {
                return;
            }
            _this.userQuestionsInvalid = null;
            if (!result.question._id) {
                //New questions
                result.question._id = 'new';
                _this.contestLocalCopy.type.questions.list.push(result.question);
                _this.contestLocalCopy.type.questions.visibleCount++;
            }
            else if (result.question._id !== 'new') {
                //Set dirty flag for the question - so server will update it in the db
                result.question.isDirty = true;
            }
        });
        modal.present();
    };
    SetContestPage.prototype.openSearchQuestions = function () {
        if (this.maxQuestionsReached()) {
            alertService.alert(this.client.translate('MAX_USER_QUESTIONS_REACHED', { max: this.client.settings['newContest'].privateQuestions.max }));
            return;
        }
        this.client.showModalPage('SearchQuestionsPage', { 'currentQuestions': this.contestLocalCopy.type.questions });
    };
    SetContestPage.prototype.removeQuestion = function (index) {
        var _this = this;
        alertService.confirm('REMOVE_QUESTION', 'CONFIRM_REMOVE_QUESTION').then(function () {
            if (_this.contestLocalCopy.type.questions.list && index < _this.contestLocalCopy.type.questions.list.length) {
                if (_this.contestLocalCopy.type.questions.list[index]._id && _this.contestLocalCopy.type.questions.list[index]._id !== 'new') {
                    //Question has an id in the database - logically remove
                    _this.contestLocalCopy.type.questions.list[index].deleted = true;
                }
                else {
                    //Question does not have an actual id in the database - physically remove
                    _this.contestLocalCopy.type.questions.list.splice(index, 1);
                }
                _this.contestLocalCopy.type.questions.visibleCount--;
            }
        }, function () {
            //do nothing on cancel
        });
    };
    SetContestPage.prototype.setContest = function () {
        var _this = this;
        analyticsService.track('contest/set');
        this.submitted = true;
        if (!this.contestForm.valid) {
            return;
        }
        //Check min questions in user Trivia
        if (this.contestLocalCopy.type.id === 'userTrivia') {
            if (!this.contestLocalCopy.type.questions || this.contestLocalCopy.type.questions.visibleCount < this.client.settings['newContest'].privateQuestions.min) {
                if (this.client.settings['newContest'].privateQuestions.min === 1) {
                    this.userQuestionsInvalid = this.client.translate('SERVER_ERROR_MINIMUM_USER_QUESTIONS_SINGLE_MESSAGE', { minimum: this.client.settings['newContest'].privateQuestions.min });
                }
                else {
                    this.userQuestionsInvalid = this.client.translate('SERVER_ERROR_MINIMUM_USER_QUESTIONS_SINGLE_MESSAGE', { minimum: this.client.settings['newContest'].privateQuestions.min });
                }
                return;
            }
        }
        var isDirty = false;
        if (this.params.data.mode === 'add') {
            isDirty = true;
        }
        else {
            //edit mode
            if (this.contestLocalCopy.teams[0].name !== this.params.data.contest.teams[0].name ||
                this.contestLocalCopy.teams[1].name !== this.params.data.contest.teams[1].name ||
                this.contestLocalCopy.subject !== this.params.data.contest.subject) {
                isDirty = true;
            }
            if (!isDirty &&
                (this.contestLocalCopy.startDate !== this.params.data.contest.startDate ||
                    this.contestLocalCopy.endDate !== this.params.data.contest.endDate ||
                    (this.contestLocalCopy.teams[0].score !== undefined && this.params.data.contest.teams[0].score !== undefined && this.contestLocalCopy.teams[0].score !== this.params.data.contest.teams[0].score) ||
                    (this.contestLocalCopy.teams[1].score !== undefined && this.params.data.contest.teams[1].score !== undefined && this.contestLocalCopy.teams[1].score !== this.params.data.contest.teams[1].score) ||
                    (this.contestLocalCopy.systemParticipants !== undefined && this.params.data.contest.systemParticipants !== undefined && this.contestLocalCopy.systemParticipants !== this.params.data.contest.systemParticipants) ||
                    (this.contestLocalCopy.rating !== undefined && this.params.data.contest.rating !== undefined && this.contestLocalCopy.rating !== this.params.data.contest.rating))) {
                isDirty = true;
            }
            if (!isDirty && this.contestLocalCopy.type.id === 'userTrivia' && JSON.stringify(this.contestLocalCopy.type) !== JSON.stringify(this.params.data.contest.type)) {
                isDirty = true;
            }
        }
        if (isDirty) {
            if (this.client.session.isAdmin) {
                //Check if scores have changed and update the deltas
                if (this.contestLocalCopy.teams[0].score !== undefined) {
                    if (this.params.data.mode === 'edit' && this.contestLocalCopy.teams[0].score !== this.params.data.contest.teams[0].score) {
                        this.contestLocalCopy.teams[0].adminScoreAddition = this.contestLocalCopy.teams[0].score - this.params.data.contest.teams[0].score;
                    }
                    else if (this.params.data.mode === 'add') {
                        this.contestLocalCopy.teams[0].adminScoreAddition = this.contestLocalCopy.teams[0].score;
                    }
                    delete this.contestLocalCopy.teams[0].score;
                }
                if (this.contestLocalCopy.teams[1].score !== undefined) {
                    if (this.params.data.mode === 'edit' && this.contestLocalCopy.teams[1].score !== this.params.data.contest.teams[1].score) {
                        this.contestLocalCopy.teams[1].adminScoreAddition = this.contestLocalCopy.teams[1].score - this.params.data.contest.teams[1].score;
                    }
                    else if (this.params.data.mode === 'add') {
                        this.contestLocalCopy.teams[1].adminScoreAddition = this.contestLocalCopy.teams[1].score;
                    }
                    delete this.contestLocalCopy.teams[1].score;
                }
            }
            contestsService.setContest(this.contestLocalCopy, this.params.data.mode).then(function (contest) {
                //Report to Analytics
                var contestParams = {
                    'team0': _this.contestLocalCopy.teams[0].name,
                    'team1': _this.contestLocalCopy.teams[1].name,
                    'duration': _this.contestLocalCopy.endOption,
                    'typeId': _this.contestLocalCopy.type.id
                };
                if (_this.params.data.mode === 'add') {
                    analyticsService.track('contest/created', contestParams);
                    _this.client.events.publish('app:contestCreated', contest);
                    _this.client.nav.pop({ animate: false }).then(function () {
                        var appPages = new Array();
                        appPages.push(new objects_1.AppPage('ContestPage', { 'contest': contest }));
                        appPages.push(new objects_1.AppPage('SharePage', { 'contest': contest, 'source': 'newContest' }));
                        _this.client.insertPages(appPages);
                    }, function () {
                    });
                }
                else {
                    analyticsService.track('contest/updated', contestParams);
                    var now = (new Date).getTime();
                    var currentStatus = contestsService.getContestStatus(_this.contestLocalCopy);
                    var previousStatus = contestsService.getContestStatus(_this.params.data.contest);
                    _this.client.events.publish('app:contestUpdated', contest, previousStatus, currentStatus);
                    _this.client.nav.pop();
                }
            }, function () {
            });
        }
        else {
            this.client.nav.pop();
        }
    };
    SetContestPage.prototype.matchingTeamsValidator = function (group) {
        var value;
        var valid = true;
        for (name in group.controls) {
            //Empty value in one of the teams will be caught in the required validator
            if (!group.controls[name].value) {
                return null;
            }
            if (value === undefined) {
                value = group.controls[name].value;
            }
            else {
                if (value && group.controls[name].value && value.trim() === group.controls[name].value.trim()) {
                    valid = false;
                    break;
                }
            }
        }
        if (valid) {
            return null;
        }
        return { matchingTeams: true };
    };
    SetContestPage.prototype.setEndsIn = function () {
        this.contestLocalCopy.endDate = this.getEndDateAccordingToEndsIn(this.contestLocalCopy.endOption);
        analyticsService.track('newContest/endsIn/click', { 'endsIn': this.contestLocalCopy.endOption });
    };
    SetContestPage.prototype.getEndDateAccordingToEndsIn = function (endsIn) {
        var endOption = this.client.settings['newContest'].endOptions[endsIn];
        var endDate = this.nowWithoutTimeEpoch + this.currentTimeOnlyInMilliseconds + (endOption.number * endOption.msecMultiplier);
        return endDate;
    };
    SetContestPage.prototype.setAdminInfo = function () {
        if (!this.contestLocalCopy.systemParticipants) {
            this.contestLocalCopy.systemParticipants = 0;
        }
        if (!this.contestLocalCopy.rating) {
            this.contestLocalCopy.rating = 0;
        }
        if (!this.contestLocalCopy.teams[0].score && this.contestLocalCopy.teams[0].score !== 0) {
            if (this.params.data.mode === 'edit') {
                this.contestLocalCopy.teams[0].score = this.params.data.contest.teams[0].score;
            }
            else {
                this.contestLocalCopy.teams[0].score = 0;
            }
            this.contestLocalCopy.teams[0].adminScoreAddition = 0;
        }
        if (!this.contestLocalCopy.teams[1].score && this.contestLocalCopy.teams[1].score !== 0) {
            if (this.params.data.mode === 'edit') {
                this.contestLocalCopy.teams[1].score = this.params.data.contest.teams[1].score;
            }
            else {
                this.contestLocalCopy.teams[1].score = 0;
            }
            this.contestLocalCopy.teams[1].adminScoreAddition = 0;
        }
        var contestName;
        if (this.params.data.mode === 'edit') {
            contestName = this.params.data.contest.name.long;
        }
        else {
            contestName = this.client.translate('CONTEST_NAME_LONG', {
                'team0': this.contestLocalCopy.teams[0].name,
                'team1': this.contestLocalCopy.teams[1].name,
                'subject': this.contestLocalCopy.subject
            });
        }
        this.client.openPage('SetContestAdminPage', {
            'contestLocalCopy': this.contestLocalCopy,
            'mode': this.params.data.mode,
            'title': this.title,
            'contestName': contestName
        });
    };
    SetContestPage.prototype.endDateSelected = function (dateSelection) {
        //Set the end date at the end of this day (e.g. 23:59:59.999)
        this.contestLocalCopy.endDate = dateSelection.epochLocal + this.currentTimeOnlyInMilliseconds;
        if (this.contestLocalCopy.endDate < this.contestLocalCopy.startDate) {
            var startDate = new Date(this.contestLocalCopy.startDate);
            startDate.clearTime(); //Start of the day
            this.contestLocalCopy.endDate = startDate.getTime() + 24 * 60 * 60 * 1000 - 1; //The end of the day of the start date (e.g. 23:59:59.999)
        }
    };
    SetContestPage.prototype.getMaxEndDate = function () {
        if (!this.client.session.isAdmin) {
            //Allow extending by the maximum end date option in the list
            var endOption = this.client.settings['newContest'].endOptions[this.endOptionKeys[this.endOptionKeys.length - 1]];
            return this.nowWithoutTimeEpoch + this.currentTimeOnlyInMilliseconds + (endOption.number * endOption.msecMultiplier);
        }
        else {
            //Unlimited
            return null;
        }
    };
    SetContestPage.prototype.subjectFocus = function () {
        if (!this.readOnlySubjectAlerted && this.contestLocalCopy.type.id === 'systemTrivia' && !this.client.session.isAdmin) {
            this.readOnlySubjectAlerted = true;
            alertService.alert({
                'type': 'SERVER_ERROR_SUBJECT_DISABLED_IN_SYSTEM_TRIVIA'
            });
        }
    };
    __decorate([
        core_1.ViewChild('team0Input'), 
        __metadata('design:type', core_1.ElementRef)
    ], SetContestPage.prototype, "team0Input", void 0);
    __decorate([
        core_1.ViewChild('team1Input'), 
        __metadata('design:type', core_1.ElementRef)
    ], SetContestPage.prototype, "team1Input", void 0);
    __decorate([
        core_1.ViewChild('subjectInput'), 
        __metadata('design:type', core_1.ElementRef)
    ], SetContestPage.prototype, "subjectInput", void 0);
    SetContestPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/set-contest/set-contest.html',
            directives: [forms_1.REACTIVE_FORM_DIRECTIVES, date_picker_1.DatePickerComponent]
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams])
    ], SetContestPage);
    return SetContestPage;
})();
exports.SetContestPage = SetContestPage;
//# sourceMappingURL=set-contest.js.map