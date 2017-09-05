import { Component, ContentChildren, QueryList, AfterContentInit } from '@angular/core'
import { SimpleTabComponent } from '../simple-tab/simple-tab';

@Component({
    selector: 'simple-tabs',
    templateUrl: 'simple-tabs.html'
})
export class SimpleTabsComponent implements AfterContentInit {

    @ContentChildren(SimpleTabComponent) simpleTabs: QueryList<SimpleTabComponent>;

    // contentChildren are set
    ngAfterContentInit() {
        // get all active tabs
        let activeTabs = this.simpleTabs.filter((simpleTab) => simpleTab.active);

        // if there is no active tab set, activate the first
        if (activeTabs.length === 0) {
            this.selectTab(this.simpleTabs.first);
        }
    }

    selectTab(simpleTab: SimpleTabComponent) {

        console.log("begin tab selected");
        // deactivate all tabs
        this.simpleTabs.toArray().forEach(tab => tab.active = false);

        // activate the tab the user has clicked on.
        simpleTab.active = true;

        //Bubble the event outside
        simpleTab.selected.emit();
        console.log("end tab selected");

    }
    
    switchToTab(tabId: number) {
        if (tabId >= 0 && tabId < this.simpleTabs.length) {
            this.selectTab(this.simpleTabs.toArray()[tabId]);
        }
    }
}
