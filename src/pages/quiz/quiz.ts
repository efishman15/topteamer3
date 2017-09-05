//TODO: return [transitioned], [animated] in html
import { Component, ViewChild, ElementRef } from '@angular/core';
import {NavParams} from 'ionic-angular';
import {Client} from '../../providers/client';
import * as contestsService from '../../providers/contests';
import * as quizService from '../../providers/quiz';
import * as soundService from '../../providers/sound';
import * as analyticsService from '../../providers/analytics';
import * as alertService from '../../providers/alert';
import {QuizData,QuizQuestion,QuizCanvasCircleStateSettings} from '../../objects/objects';

@Component({
  templateUrl: 'quiz.html'
})

export class QuizPage {

  client:Client;
  params:NavParams;
  source:string;
  quizData:QuizData;
  questionHistory:Array<QuizQuestion> = [];
  correctButtonName:string;

  //Canvas vars
  currentQuestionCircle:any;
  pageInitiated:Boolean = false;
  quizStarted:Boolean = false;
  title:string;
  circleOuterRadius:number;
  circleInnerRadius:number;

  @ViewChild('quizCanvas') quizCanvasElementRef:ElementRef;
  quizCanvas:HTMLCanvasElement;
  quizContext:CanvasRenderingContext2D;
  private resizeHandler:() => void;

  constructor(params:NavParams) {
    this.client = Client.getInstance();
    this.params = params;

    if (this.params.data.contest.leadingTeam === -1) {
      this.title = this.client.translate('TIE');
    }
    else {
      this.title = this.client.translate('QUIZ_VIEW_TITLE', {'team': this.params.data.contest.teams[this.params.data.contest.leadingTeam].name});
    }
  }

  ionViewDidLoad() {
    this.resizeHandler = () => {
      this.drawQuizProgress();
    }
    this.client.events.subscribe('app:resize', this.resizeHandler);
  }

  ionViewWillUnload() {
    this.client.events.unsubscribe('app:resize', this.resizeHandler);
  }

  ngAfterViewInit() {
    this.quizCanvas = this.quizCanvasElementRef.nativeElement;
    this.quizContext = this.quizCanvas.getContext('2d');
  }

  ionViewWillEnter() {
    analyticsService.track('page/quiz', {'contestId': this.params.data.contest._id});
    this.startQuiz();
  }

  startQuiz() {

    if (this.quizStarted) {
      //could happen if view is cached or returning from questionStats
      return;
    }

    this.clearQuizProgress(); //From previous time

    analyticsService.track('quiz/started', {
      'source': this.params.data.source,
      'typeId': this.params.data.contest.type.id
    });
    quizService.start(this.params.data.contest._id).then((data) => {
      this.quizStarted = true;
      this.quizData = data.quiz;
      this.quizData.currentQuestion.answered = false;

      var radius = this.quizCanvas.width / (2 * data.quiz.totalQuestions + (data.quiz.totalQuestions - 1) * this.client.settings.quiz.canvas.circle.radius.spaceRatio);
      if (radius > this.client.settings.quiz.canvas.circle.radius.max) {
        radius = this.client.settings.quiz.canvas.circle.radius.max;
      }
      else if (radius < this.client.settings.quiz.canvas.circle.radius.min) {
        radius = this.client.settings.quiz.canvas.circle.radius.min;
      }
      this.circleOuterRadius = radius;
      this.circleInnerRadius = this.circleOuterRadius * (1 - this.client.settings.quiz.canvas.circle.radius.outerBorderRatio);

      for (var i = 0; i < data.quiz.totalQuestions; i++) {
        var score:number;
        if (this.params.data.contest.type.id === 'systemTrivia') {
          //System Trivia
          score = this.client.settings.quiz.questions[this.params.data.contest.type.id].scores[i];
        }
        else if (this.params.data.contest.type.id === 'userTrivia') {
          //User Trivia
          score = this.client.settings.quiz.questions[this.params.data.contest.type.id].questionScore;
        }
        else {
          score = 0;
        }
        this.questionHistory.push(new QuizQuestion(score));
      }

      this.drawQuizProgress();

      if (this.quizData.reviewMode && this.quizData.reviewMode.reason) {
        alertService.alert(this.client.translate(this.quizData.reviewMode.reason)).then(()=> {
        }, ()=> {
        });
      }

    }, (err:any) => {
      switch (err.type) {
        case 'SERVER_ERROR_GENERAL':
          this.client.nav.pop();
          break;
        case 'SERVER_ERROR_CONTEST_ENDED':
          //additionalInfo contains the updated contest object from the server
          contestsService.setContestClientData(err.additionalInfo.contest);
          setTimeout(()=> {
            this.client.nav.pop().then(()=> {
              console.log('quiz pop completed');
              this.client.events.publish('app:contestUpdated', err.additionalInfo.contest, this.params.data.contest.status, err.additionalInfo.contest.status);
              console.log('quiz results published to contest');
            }, () => {
            });
          }, 1000);
          break;
        default:
          //Allow the user to answer again - probably timeout error
          this.quizData.currentQuestion.answered = false;
          break;
      }
    });
  }

  submitAnswer(answerId) {

    this.quizData.currentQuestion.answered = true;

    quizService.answer(answerId, this.questionHistory[this.quizData.currentQuestionIndex].hintUsed, this.questionHistory[this.quizData.currentQuestionIndex].answerUsed).then((data) => {

      var correctAnswerId;

      this.questionHistory[this.quizData.currentQuestionIndex].answered = data.question.correct;

      if (data.results) {
        //Will get here when quiz is finished
        this.quizData.results = data.results;
      }

      //Rank might change during quiz - and feature might open
      if (data.features) {
        this.client.session.features = data.features;
      }

      if (data.xpProgress) {
        this.quizData.xpProgress = data.xpProgress;
      }
      else {
        this.quizData.xpProgress = null;
      }

      if (data.question.correct) {

        analyticsService.track('quiz/question' + (this.quizData.currentQuestionIndex + 1) + '/answered/correct');

        correctAnswerId = answerId;
        this.quizData.currentQuestion.answers[answerId].answeredCorrectly = true;

        soundService.play('audio/click_ok');
      }
      else {
        analyticsService.track('quiz/question' + (this.quizData.currentQuestionIndex + 1) + '/answered/incorrect');
        soundService.play('audio/click_wrong');
        correctAnswerId = data.question.correctAnswerId;
        this.quizData.currentQuestion.answers[answerId].answeredCorrectly = false;
        setTimeout(() => {
          this.quizData.currentQuestion.answers[data.question.correctAnswerId].correct = true;
        }, this.client.settings.quiz.question.wrongAnswerMillisecondsDelay)
      }

      this.correctButtonName = 'buttonAnswer' + correctAnswerId;

    }, (err:any) => {
      switch (err.type) {
        case 'SERVER_ERROR_SESSION_EXPIRED_DURING_QUIZ':
          this.startQuiz();
          break;
        case 'SERVER_ERROR_GENERAL':
          this.client.nav.pop();
          break;
        default:
          //Allow the user to answer again - probably timeout error
          this.quizData.currentQuestion.answered = false;
          break;
      }
    });
  }

  nextQuestion() {

    quizService.nextQuestion().then((data) => {

      this.quizData = data;
      this.quizData.currentQuestion.answered = false;
      this.quizData.currentQuestion.doAnimation = true; //Animation end will trigger quiz proceed

      this.drawQuizProgress();

      analyticsService.track('quiz/gotQuestion' + (this.quizData.currentQuestionIndex + 1));
    }, () => {
    });
  }

  questionTransitionEnd() {
    if (this.quizData && this.quizData.currentQuestion) {
      this.quizData.currentQuestion.doAnimation = false; //Animation end will trigger quiz proceed
    }
  }

  buttonAnimationEnded(event:Event) {
    if (this.quizData.xpProgress && this.quizData.xpProgress.addition > 0) {
      this.client.playerInfoComponent.addXp(this.quizData.xpProgress).then(() => {
        if (this.correctButtonName === event.srcElement['name']) {
          if (!this.quizData.xpProgress.rankChanged) {
            this.quizProceed();
          }
          else {
            var modal = this.client.createModalPage('NewRankPage', {
              'xpProgress': this.quizData.xpProgress
            });

            modal.onDidDismiss((okPressed) => {
              this.quizProceed();
            });

            modal.present();

          }
        }
      }, ()=> {
      });
    }
    else if (this.correctButtonName === event.srcElement['name']) {
      this.quizProceed();
    }
  }

  quizProceed() {
    if (this.quizData.finished) {

      this.drawQuizProgress();
      this.client.session.score += this.quizData.results.data.score;

      analyticsService.track('quiz/finished',
        {
          'score': '' + this.quizData.results.data.score,
          'message': this.quizData.results.data.clientKey
        });

      //Give enough time to draw the circle progress of the last question
      setTimeout(() => {
        this.client.nav.pop().then(() => {
          this.client.events.publish('app:quizFinished', this.quizData.results);
          //For next time if view remains cached
          this.quizStarted = false;
        }, ()=> {
        });
      }, 1000);

    }
    else {
      this.nextQuestion();
    }
  }

  canvasClick(event) {

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

        modal.onDidDismiss((action) => {
          switch (action) {
            case 'hint':
              this.questionHistory[this.quizData.currentQuestionIndex].hintUsed = true;
              this.questionHistory[this.quizData.currentQuestionIndex].score -= this.quizData.currentQuestion.hintCost;
              this.drawQuizScores();
              window.open(this.client.currentLanguage.wiki + this.quizData.currentQuestion.wikipediaHint, '_system', 'location=yes');
              break;

            case 'answer':
              this.questionHistory[this.quizData.currentQuestionIndex].answerUsed = true;
              this.questionHistory[this.quizData.currentQuestionIndex].score -= this.quizData.currentQuestion.answerCost;
              this.drawQuizScores();
              window.open(this.client.currentLanguage.wiki + this.quizData.currentQuestion.wikipediaAnswer, '_system', 'location=yes');
              break;
          }
        });

        modal.present();
      }
    }
  }

  drawQuizProgress() {

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

  }

  drawQuestionCircle(x:number, radius:number, color:string, startAngle?:any, endAngle?:any, counterClockwise?:any) {

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

  }

  drawQuestionState(x:number, state:QuizCanvasCircleStateSettings) {

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

  }

  clearQuizScores() {
    this.quizContext.clearRect(0, 0, this.quizCanvas.width, this.client.settings.quiz.canvas.scores.size.top);
  }

  clearQuizProgress() {
    this.quizContext.clearRect(0, 0, this.quizCanvas.width, this.quizCanvas.height);
  }

  drawQuizScores() {

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
  }

  openQuestionEditor() {

    var question = {
      '_id': this.quizData.currentQuestion._id,
      'text': this.quizData.currentQuestion.text,
      'answers': []
    };

    for (var i = 0; i < this.quizData.currentQuestion.answers.length; i++) {
      question.answers[this.quizData.currentQuestion.answers[i].originalIndex] = this.quizData.currentQuestion.answers[i].text;
    }
    var modal = this.client.createModalPage('QuestionEditorPage', {'question': question, 'mode': 'edit'});
    modal.onDidDismiss((result) => {
      if (!result) {
        return;
      }

      quizService.setQuestionByAdmin(result.question).then(() => {
        this.quizData.currentQuestion.text = result.question.text;
        for (var i = 0; i < result.question.answers.length; i++) {
          this.quizData.currentQuestion.answers[i].text = result.question.answers[this.quizData.currentQuestion.answers[i].originalIndex];
        }
      }, () => {
      })
    })
    modal.present();
  }

  share() {
    this.client.share(this.params.data.contest, 'quiz');
  }

  getCanvasFont(bold:boolean, size:string, name:string) {
    var font = '';
    if (bold) {
      font += 'bold ';
    }
    font += size + ' ' + name;

    return font;
  }
}
