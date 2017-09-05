import {Directive, Input, Output, EventEmitter} from '@angular/core';

@Directive({
  selector: '[animated]',
  host: {
    '(animationstart)': 'animationStarted($event)',
    '(animationend)': 'animationEnded($event)',
    '(webkitAnimationStart)': 'animationStarted($event)',
    '(webkitAnimationEnd)': 'animationEnded($event)',
    '(oanimationstart)': 'animationStarted($event)',
    '(oanimationend)': 'animationEnded($event)',
    '(MSAnimationStart)': 'animationStarted($event)',
    '(MSAnimationEnd)': 'animationEnded($event)'
  }
})
export class AnimationListener {
  @Input() animated : string;
  @Output() animationStart = new EventEmitter<any>();
  @Output() animationEnd = new EventEmitter<any>();

  constructor() {
  }

  animationStarted($event: Event): void {
    this.animationStart.emit($event);
  }

  animationEnded($event: Event): void {
    this.animationEnd.emit($event);
  }
}
