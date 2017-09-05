import {Component,ViewChild, ElementRef} from '@angular/core';
import {NavParams,ViewController} from 'ionic-angular';
import {Client} from '../../providers/client';
import {QuizQuestion} from "../../objects/objects";
import * as analyticsService from '../../providers/analytics';

@Component({
  templateUrl: 'question-stats.html'
})
export class QuestionStatsPage {

  client:Client;
  question:QuizQuestion;
  viewController:ViewController;
  correctRatioRounded:number;
  private resizeHandler: () => void;

  // get the element with the #chessCanvas on it
  @ViewChild("questionStatsCanvas") questionStatsCanvasElementRef:ElementRef;
  questionStatsCanvas:HTMLCanvasElement;
  questionStatsContext:CanvasRenderingContext2D;

  constructor(params:NavParams, viewController:ViewController) {
    this.client = Client.getInstance();
    this.question = params.data.question;
    this.viewController = viewController;


  }

  ionViewDidLoad() {
    this.resizeHandler = () => {
      if (this.question.correctRatio || this.question.correctRatio === 0) {
        this.drawChart();
      }
    }
    this.client.events.subscribe('app:resize', this.resizeHandler);
  }

  ionViewWillUnload() {
    this.client.events.unsubscribe('app:resize', this.resizeHandler);
  }

  //The only life cycle eve currently called in modals
  ngAfterViewInit() {
    if (this.question.correctRatio || this.question.correctRatio === 0) {
      this.questionStatsCanvas = this.questionStatsCanvasElementRef.nativeElement;
      this.questionStatsContext = this.questionStatsCanvas.getContext('2d');
      this.correctRatioRounded = Math.round(this.question.correctRatio * 100);
    }
  }

  ionViewWillEnter() {
    analyticsService.track('page/questionStats', {'questionId': this.question._id});
    if (this.question.correctRatio || this.question.correctRatio === 0) {
      this.drawChart();
    }
  }

  drawChart() {

    this.questionStatsCanvas.width = this.client.width * this.client.settings.charts.questionStats.size.widthRatio;
    this.questionStatsCanvas.height = this.client.height * this.client.settings.charts.questionStats.size.heightRatio;

    let radius:number;
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
  }

  dismiss(action) {
    analyticsService.track('quiz/stats/' + (action ? action : 'cancel'));
    this.viewController.dismiss(action);
  }

  drawQuestionStatsCircle(radius:number, color:string, startAngle?:any, endAngle?:any, counterClockwise?:any) {

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

  }

}
