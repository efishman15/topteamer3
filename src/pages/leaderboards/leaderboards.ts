import {Component} from '@angular/core';
import {Client} from '../../providers/client';

@Component({
    templateUrl: 'leaderboards.html'
})

export class LeaderboardsPage {

    client: Client;
    mode: string;

    constructor() {
        this.client = Client.getInstance();
        this.mode = 'contests';
    }

    tabSelected(mode: string) {
        this.mode = mode;
    }
}
