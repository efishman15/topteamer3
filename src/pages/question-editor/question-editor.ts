import {FormControl, FormGroup, Validators} from '@angular/forms';
import {Component,ViewChild,ElementRef} from '@angular/core';
import {NavParams,ViewController,Content} from 'ionic-angular';
import {Client} from '../../providers/client';
import {Question,Questions} from '../../objects/objects';
import * as analyticsService from '../../providers/analytics';

@Component({
  templateUrl: 'question-editor.html'
})
export class QuestionEditorPage {

  @ViewChild(Content) content: Content;

  //Ionic bug - maxlength property is not copied to the native element, submitted:
  //https://github.com/driftyco/ionic/issues/7635
  @ViewChild('questionTextArea') questionTextArea:ElementRef;
  @ViewChild('answer0TextArea') answer0TextArea:ElementRef;
  @ViewChild('answer1TextArea') answer1TextArea:ElementRef;
  @ViewChild('answer2TextArea') answer2TextArea:ElementRef;
  @ViewChild('answer3TextArea') answer3TextArea:ElementRef;

  client:Client;
  question:Question;
  mode:string;
  viewController:ViewController;
  title:String;
  currentQuestions: Questions;
  questionError:String;
  answersError:String;
  submitted:Boolean;

  questionEditorForm: FormGroup;
  fieldInFocus: number;

  constructor(params:NavParams, viewController: ViewController) {
    this.client = Client.getInstance();
    this.viewController = viewController;
    this.fieldInFocus = -1;
    this.mode = params.data.mode;

    if (this.mode === 'add') {
      this.title = this.client.translate('NEW_QUESTION');
      this.question =  new Question();
    }
    else if (this.mode === 'edit') {
      this.title = this.client.translate('EDIT_QUESTION');
      this.question = params.data.question;
    }

    this.questionEditorForm = new FormGroup({
      question: new FormControl('',[Validators.required, Validators.maxLength(this.client.settings.quiz.question.maxLength)]),
      answer0: new FormControl('',[Validators.required, Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
      answer1: new FormControl('',[Validators.required, Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
      answer2: new FormControl('',[Validators.required, Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
      answer3: new FormControl('',[Validators.required, Validators.maxLength(this.client.settings.quiz.question.answer.maxLength)]),
    });

    this.currentQuestions = params.data.currentQuestions;
    this.submitted = false;

  }

  ionViewWillEnter() {
      var eventData = { 'mode': this.mode };
      if (this.mode === 'edit') {
          eventData['questionId'] = this.question._id;
      }
      analyticsService.track('page/questionEditor', eventData);
  }

  dismiss(applyChanges) {

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
      for (var j=0; i<this.question.answers.length; j++) {
        if (!answersHash) {
          answersHash = {};
          answersHash[this.question.answers[j]] = true;
        }
        else if (answersHash[this.question.answers[j]]) {
          this.answersError = this.client.translate('SERVER_ERROR_ENTER_DIFFERENT_ANSWERS_MESSAGE');
          return;
        }
        else {
          answersHash[this.question.answers[j]] = true;
        }
      }

      result = {'question': this.question, 'mode': this.mode}
    }

    this.viewController.dismiss(result);
  }

  inputFocus(event: Event) {
    this.content.scrollTo(0,event.target['offsetParent']['offsetTop']);
  }
}
