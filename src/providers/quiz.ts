import {Client} from './client';

//------------------------------------------------------
//-- start
//------------------------------------------------------
export let start = (contestId : string) => {
  var postData = {'contestId': contestId};
  var client = Client.getInstance();
  return client.serverPost('quiz/start', postData);
}

//------------------------------------------------------
//-- answer
//------------------------------------------------------
export let answer = (answerId: number, hintUsed: boolean, answerUsed: boolean) => {
  var postData = {'id': answerId};
  if (hintUsed) {
    postData['hintUsed'] = hintUsed;
  }
  if (answerUsed) {
    postData['answerUsed'] = answerUsed;
  }
  var client = Client.getInstance();
  return client.serverPost('quiz/answer', postData);
}

//------------------------------------------------------
//-- nextQuestion
//------------------------------------------------------
export let nextQuestion = () => {
  var client = Client.getInstance();
  return client.serverPost('quiz/nextQuestion');
}

//------------------------------------------------------
//-- setQuestionByAdmin
//------------------------------------------------------
export let setQuestionByAdmin = function (question) {
  var postData = {'question': question};
  var client = Client.getInstance();
  return client.serverPost('quiz/setQuestionByAdmin', postData);
};
