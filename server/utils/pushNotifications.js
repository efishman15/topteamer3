var path = require('path');
var gcm = require('node-gcm');
var generalUtils = require(path.resolve(__dirname, './general'));
var logger = require(path.resolve(__dirname, './logger'));

//--------------------------------------------------------------------------
// send
// Retrieves an item from cache
//--------------------------------------------------------------------------
module.exports.send = function(users, messageData) {
  var service = new gcm.Sender(generalUtils.settings.server.google.api.gcmApiKey);
  var message = new gcm.Message({'data' : messageData});

  service.send(message, { registrationTokens: users }, function (err, response) {
    if(err) {
      logger.server.error(null, 'error sending gcm: ' + JSON.stringify(err));
    }
  });

};
