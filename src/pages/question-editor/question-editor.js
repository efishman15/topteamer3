var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var forms_1 = require('@angular/forms');
var core_1 = require('@angular/core');
var ionic_angular_1 = require('ionic-angular');
var client_1 = require('../../providers/client');
var objects_1 = require('../../objects/objects');
var analyticsService = require('../../providers/analytics');
var QuestionEditorPage = (function () {
    function QuestionEditorPage(params, viewController) {
        this.client = client_1.Client.getInstance();
        this.viewController = viewController;
        this.fieldInFocus = -1;
        this.mode = params.data.mode;
        if (this.mode === 'add') {
            this.title = this.client.translate('NEW_QUESTION');
            this.question = new objects_1.Question();
        }
        else if (this.mode === 'edit') {
            this.title = this.client.translate('EDIT_QUESTION');
            this.question = params.data.question;
        }
        this.questionEditorForm = new forms_1.FormGroup({
            question: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.quiz.question.maxLength)]),
            answer0: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
            answer1: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
            answer2: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
            answer3: new forms_1.FormControl('', [forms_1.Validators.required, forms_1.Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
        });
        this.currentQuestions = params.data.currentQuestions;
        this.submitted = false;
    }
    //The only life cycle eve currently called in modals
    QuestionEditorPage.prototype.ngAfterViewInit = function () {
        var eventData = { 'mode': this.mode };
        if (this.mode === 'edit') {
            eventData['questionId'] = this.question._id;
        }
        analyticsService.track('page/questionEditor', eventData);
        this.questionTextArea['_native']._elementRef.nativeElement.maxLength = this.client.settings.quiz.question.maxLength;
        this.answer0TextArea['_native']._elementRef.nativeElement.maxLength = this.client.settings.quiz.question.answer.maxLength;
        this.answer1TextArea['_native']._elementRef.nativeElement.maxLength = this.client.settings.quiz.question.answer.maxLength;
        this.answer2TextArea['_native']._elementRef.nativeElement.maxLength = this.client.settings.quiz.question.answer.maxLength;
        this.answer3TextArea['_native']._elementRef.nativeElement.maxLength = this.client.settings.quiz.question.answer.maxLength;
    };
    QuestionEditorPage.prototype.dismiss = function (applyChanges) {
        analyticsService.track('question/' + (applyChanges ? 'set' : 'cancel'));
        var result;
        if (applyChanges) {
            this.submitted = true;
            if (!this.questionEditorForm.valid) {
                return;
            }
            //Check for duplicate questions
            if (this.currentQuestions && this.currentQuestions.list && this.currentQuestions.list.length > 0) {
                //Check if question exists
                var matchCount = 0;
                for (var i = 0; i < this.currentQuestions.list.length; i++) {
                    if (this.question.text.trim() === this.currentQuestions.list[i].text.trim()) {
                        matchCount++;
                    }
                }
                if ((!this.question._id && matchCount > 0) || matchCount > 1) {
                    //In edit mode - the question text will be matched at least once - to the current question in the list
                    this.questionError = this.client.translate('SERVER_ERROR_QUESTION_ALREADY_EXISTS_MESSAGE');
                    return;
                }
            }
            //Check for duplicate answers
            var answersHash;
            for (var i = 0; i < this.question.answers.length; i++) {
                if (!answersHash) {
                    answersHash = {};
                    answersHash[this.question.answers[i]] = true;
                }
                else if (answersHash[this.question.answers[i]]) {
                    this.answersError = this.client.translate('SERVER_ERROR_ENTER_DIFFERENT_ANSWERS_MESSAGE');
                    return;
                }
                else {
                    answersHash[this.question.answers[i]] = true;
                }
            }
            result = { 'question': this.question, 'mode': this.mode };
        }
        this.viewController.dismiss(result);
    };
    QuestionEditorPage.prototype.inputFocus = function (event) {
        this.content.scrollTo(0, event.target['offsetParent']['offsetTop']);
    };
    __decorate([
        core_1.ViewChild(ionic_angular_1.Content), 
        __metadata('design:type', ionic_angular_1.Content)
    ], QuestionEditorPage.prototype, "content", void 0);
    __decorate([
        core_1.ViewChild('questionTextArea'), 
        __metadata('design:type', core_1.ElementRef)
    ], QuestionEditorPage.prototype, "questionTextArea", void 0);
    __decorate([
        core_1.ViewChild('answer0TextArea'), 
        __metadata('design:type', core_1.ElementRef)
    ], QuestionEditorPage.prototype, "answer0TextArea", void 0);
    __decorate([
        core_1.ViewChild('answer1TextArea'), 
        __metadata('design:type', core_1.ElementRef)
    ], QuestionEditorPage.prototype, "answer1TextArea", void 0);
    __decorate([
        core_1.ViewChild('answer2TextArea'), 
        __metadata('design:type', core_1.ElementRef)
    ], QuestionEditorPage.prototype, "answer2TextArea", void 0);
    __decorate([
        core_1.ViewChild('answer3TextArea'), 
        __metadata('design:type', core_1.ElementRef)
    ], QuestionEditorPage.prototype, "answer3TextArea", void 0);
    QuestionEditorPage = __decorate([
        core_1.Component({
            templateUrl: 'build/pages/question-editor/question-editor.html',
            directives: [forms_1.REACTIVE_FORM_DIRECTIVES]
        }), 
        __metadata('design:paramtypes', [ionic_angular_1.NavParams, ionic_angular_1.ViewController])
    ], QuestionEditorPage);
    return QuestionEditorPage;
})();
exports.QuestionEditorPage = QuestionEditorPage;
//# sourceMappingURL=question-editor.js.map