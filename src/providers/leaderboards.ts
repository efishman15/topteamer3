import {Client} from './client';

//------------------------------------------------------
//-- friends
//------------------------------------------------------
export let friends = () => {
  var client = Client.getInstance();
  return client.serverPost('leaderboard/friends');
}

//------------------------------------------------------
//-- weekly
//------------------------------------------------------
export let weekly = () => {
  var client = Client.getInstance();
  return client.serverPost('leaderboard/weekly');
}

//------------------------------------------------------
//-- contest
//------------------------------------------------------
export let contest = (contestId: string, teamId? : number) => {
  var postData = {'contestId' : contestId};
  if (teamId === 0 || teamId === 1) {
    postData['teamId'] = teamId;
  }
  var client = Client.getInstance();
  return client.serverPost('leaderboard/contest', postData);
}

