import {Directive, Input, Output, EventEmitter} from '@angular/core';

@Directive({
  selector: '[transitioned]',
  host: {
    '(transitionstart)': 'transitionStart()',
    '(transitionend)': 'transitionEnded()',
    '(webkitTransitionStart)': 'transitionStarted()',
    '(webkitTransitionEnd)': 'transitionEnded()',
    '(otransitionstart)': 'transitionStarted()',
    '(otransitionend)': 'transitionEnded()',
    '(animationstart)': 'transitionStarted()',
    '(animationend)': 'transitionEnded()',
    '(webkitAnimationStart)': 'transitionStarted($event)',
    '(webkitAnimationEnd)': 'transitionEnded($event)',
    '(oanimationstart)': 'transitionStarted($event)',
    '(oanimationend)': 'transitionEnded($event)',
    '(MSAnimationStart)': 'transitionStarted($event)',
    '(MSAnimationEnd)': 'transitionEnded($event)',
  }
})
export class TransitionListener {
  @Input() transitioned : string;
  @Output() transitionStart = new EventEmitter<any>();
  @Output() transitionEnd = new EventEmitter<any>();

  constructor() {
  }

  transitionStarted($event: Event): void {
    this.transitionStart.emit($event);
  }

  transitionEnded($event: Event): void {
    this.transitionEnd.emit($event);
  }
}
