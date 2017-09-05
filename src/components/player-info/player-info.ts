import {Component,ViewChild, ElementRef} from '@angular/core';
import {Client} from '../../providers/client';
import {XpProgress} from '../../objects/objects';

@Component({
  selector: 'player-info',
  templateUrl: 'player-info.html'
})
export class PlayerInfoComponent {

  client:Client;
  @ViewChild('playerInfoCanvas') canvasElementRef:ElementRef;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  canvasCenterX:number;
  canvasCenterY:number;

  circle:number = Math.PI * 2;
  quarter:number = Math.PI / 2;
  height:number = 0;
  hidden:boolean;

  constructor() {
    this.hidden = true;
  }

  ngAfterViewInit() {
    this.canvas = this.canvasElementRef.nativeElement;
    this.context = this.canvas.getContext('2d');

    this.canvasCenterX = this.canvas.width / 2;
    this.canvasCenterY = this.canvas.height / 2;
  }

  init(client:Client) {
    this.client = client;
    this.initXp();
    this.hidden = false;
  }

  clearXp() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  initXp() {
    this.clearXp();

    //-------------------------------------------------------------------------------------
    // Draw the full circle representing the entire xp required for the next level
    //-------------------------------------------------------------------------------------
    this.context.beginPath();

    this.context.arc(this.canvasCenterX, this.canvasCenterY, this.client.settings.xpControl.radius, 0, this.circle, false);
    this.context.fillStyle = this.client.settings.xpControl.fillColor;
    this.context.fill();

    //Full line color
    this.context.lineWidth = this.client.settings.xpControl.lineWidth;
    this.context.strokeStyle = this.client.settings.xpControl.fullLineColor;
    this.context.stroke();
    this.context.closePath();

    //-------------------------------------------------------------------------------------
    //Draw the arc representing the xp in the current level
    //-------------------------------------------------------------------------------------
    this.context.beginPath();

    // line color
    this.context.arc(this.canvasCenterX, this.canvasCenterY, this.client.settings.xpControl.radius, -(this.quarter), ((this.client.session.xpProgress.current / this.client.session.xpProgress.max) * this.circle) - this.quarter, false);
    this.context.strokeStyle = this.client.settings.xpControl.progressLineColor;
    this.context.stroke();

    //Rank Text
    var font = '';
    if (this.client.settings.xpControl.font.bold) {
      font += 'bold ';
    }

    var fontSize;
    if (this.client.session.rank < 10) {
      //1 digit font
      fontSize = this.client.settings.xpControl.font.d1;
    }
    else if (this.client.session.rank < 100) {
      //2 digits font
      fontSize = this.client.settings.xpControl.font.d2;
    }
    else {
      fontSize = this.client.settings.xpControl.font.d3;
    }
    font += fontSize + ' ';

    font += this.client.settings.xpControl.font.name;

    this.context.font = font;

    // Move it down by half the text height and left by half the text width
    var rankText = '' + this.client.session.rank;
    var textWidth = this.context.measureText(rankText).width;
    var textHeight = this.context.measureText('w').width;

    this.context.fillStyle = this.client.settings.xpControl.textColor;
    let direction:number;
    if (this.client.currentLanguage.direction === 'ltr') {
      direction = 1;
    }
    else {
      direction = -1;
    }
    this.context.fillText(rankText, this.canvasCenterX - (direction * (textWidth / 2)), this.canvasCenterY + (textHeight / 2));

    this.context.closePath();
  }

  animateXpAddition(startPoint, endPoint) {

    this.context.beginPath();
    this.context.arc(this.canvasCenterX, this.canvasCenterY, this.client.settings.xpControl.radius, (this.circle * startPoint) - this.quarter, (this.circle * endPoint) - this.quarter, false);
    this.context.strokeStyle = this.client.settings.xpControl.progressLineColor;
    this.context.stroke();
    this.context.closePath();
  }

  addXp(xpProgress:XpProgress) {

    return new Promise((resolve, reject) => {

      var startPoint = this.client.session.xpProgress.current / this.client.session.xpProgress.max;

      //Occurs after xp has already been added to the session
      var addition = xpProgress.addition;
      for (var i = 1; i <= addition; i++) {
        window.myRequestAnimationFrame(() => {
          var endPoint = (this.client.session.xpProgress.current + i) / this.client.session.xpProgress.max;
          this.animateXpAddition(startPoint, endPoint);

          //Last iteration should be performed after the animation frame event happened
          if (i >= addition) {

            //Add the actual xp to the client side
            this.client.session.xpProgress = xpProgress;

            //Zero the addition
            this.client.session.xpProgress.addition = 0;

            if (xpProgress.rankChanged) {
              this.client.session.rank = xpProgress.rank;
              this.initXp();
            }
          }
        })
      }
      resolve();
    });

  }

  myAvatarClick(event: Event) {
      //Avoid opening 'SetUserPage' twice
      if (this.client.nav.getActive().component.name !== 'SetUserPage') {
        this.client.openPage('SetUserPage');
    }
  }
}
