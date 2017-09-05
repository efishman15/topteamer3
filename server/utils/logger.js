var path = require('path');
var logger = require('bunyan');
BunyanMailgun = require('bunyan-mailgun');

var emailStream;
module.exports.initMail = function (mailgunSettings) {
  emailStream = new BunyanMailgun(mailgunSettings);

  module.exports.mail = logger.createLogger({
    name: 'topTeamerMail',
    streams: [{
      type: 'raw', // You should use EmailStream with 'raw' type!
      stream: emailStream
    }]
  });
}

//Server log is dual - both to a file and to the console
module.exports.server = logger.createLogger({
  name: 'topTeamerServer',
  streams: [
    {
      type: 'rotating-file',
      path: path.resolve(__dirname, '../logs/server.log'),
      period: '1d',   // daily rotation
      count: 30        // keep back copies
    },
    {
      stream: process.stderr
      // `type: 'stream'` is implied
    }],
  serializers: {
    req: reqSerializer
  }
});

module.exports.client = logger.createLogger({
  name: 'client',
  streams: [{
    type: 'rotating-file',
    path: path.resolve(__dirname, '../logs/client/client.log'),
    period: '1d',   // daily rotation
    count: 180        // keep back copies
  }],
  serializers: {
    req: reqSerializer
  }
});

module.exports.paypalIPN = logger.createLogger({
  name: 'topTeamerPayPalIPN',
  streams: [{
    type: 'rotating-file',
    path: path.resolve(__dirname, '../logs/paypal/paypalIPN.log'),
    period: '1d',   // daily rotation
    count: 180        // keep back copies
  }],
  serializers: {
    req: reqSerializer
  }
});

module.exports.facebookIPN = logger.createLogger({
  name: 'topTeamerFacebookIPN',
  streams: [{
    type: 'rotating-file',
    path: path.resolve(__dirname, '../logs/facebook/facebookIPN.log'),
    period: '1d',   // daily rotation
    count: 180        // keep back copies
  }],
  serializers: {
    req: reqSerializer
  }
});

//-------------------------------------------------------------------------------------
// Private functions
//-------------------------------------------------------------------------------------
function reqSerializer(req) {
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  }
}
