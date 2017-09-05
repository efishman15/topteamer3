import { Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'simple-tab',
  templateUrl: 'simple-tab.html'
})

export class SimpleTabComponent {
    @Input() simpleTabTitle: string;
    @Input() active = false;

    @Output() selected = new EventEmitter();
}
