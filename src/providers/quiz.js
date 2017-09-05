var client_1 = require('./client');
//------------------------------------------------------
//-- start
//------------------------------------------------------
exports.start = function (contestId) {
    var postData = { 'contestId': contestId };
    var client = client_1.Client.getInstance();
    return client.serverPost('quiz/start', postData);
};
//------------------------------------------------------
//-- answer
//------------------------------------------------------
exports.answer = function (answerId, hintUsed, answerUsed) {
    var postData = { 'id': answerId };
    if (hintUsed) {
        postData['hintUsed'] = hintUsed;
    }
    if (answerUsed) {
        postData['answerUsed'] = answerUsed;
    }
    var client = client_1.Client.getInstance();
    return client.serverPost('quiz/answer', postData);
};
//------------------------------------------------------
//-- nextQuestion
//------------------------------------------------------
exports.nextQuestion = function () {
    var client = client_1.Client.getInstance();
    return client.serverPost('quiz/nextQuestion');
};
//------------------------------------------------------
//-- setQuestionByAdmin
//------------------------------------------------------
exports.setQuestionByAdmin = function (question) {
    var postData = { 'question': question };
    var client = client_1.Client.getInstance();
    return client.serverPost('quiz/setQuestionByAdmin', postData);
};
//# sourceMappingURL=quiz.js.map