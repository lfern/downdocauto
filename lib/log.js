'use strict'

var winston = require('winston');

var myCustomLevels = {
  error: 0,
  warn: 1,
  debug: 2,
  info: 3,
  verbose : 4,
  silly : 5
};
var myCustomcolors = {
  error: "black",
  warn: "black",
  debug: "black",
  info: "black",
  verbose : "black",
  silly : "black"
};

class WebsocketTransport extends winston.Transport{
  constructor(options, wsoket) {
    super();
    this.name = 'WebsocketTransport';
    this.level = options.level || 'info';
    this.wsocket = wsoket;
  }

  log (level, msg, meta, callback) {
    //
    // Store this message and metadata, maybe use some custom logic
    // then callback indicating success.
    //
    this.wsocket.emit("log",msg);
    callback(null, true);
  }

}

class SailsTransport extends winston.Transport{
  constructor(options, sLog) {
    super();
    this.name = 'SailsTransport';
    this.level = options.level || 'info';
    this.sLog = sLog;
  }

  log (level, msg, meta, callback) {
    //
    // Store this message and metadata, maybe use some custom logic
    // then callback indicating success.
    //
    if(typeof this.sLog["level"] === 'function') {
      this.sLog["level"](msg);
    } else {
      this.sLog.debug(msg);
    }
    callback(null, true);
  }
}

class NullTransport extends winston.Transport{
  constructor(options) {
    super();
    this.name = 'NullTransport';
  }

  log (level, msg, meta, callback) {
    callback(null, true);
  }

}

function nullLogger(){
  var logger = new winston.Logger({
    exitOnError: false,
    level: 'info',
    levels: myCustomLevels,
    colors: myCustomcolors,
    transports: [new NullTransport({})]
 });
 return logger;
}

function getLogger(options, sailsLog, request){
  var transports = [new SailsTransport(options,sailsLog)];
  if (request.isSocket){
    transports.push(new WebsocketTransport(options,request.socket));
  }
  var logger = new winston.Logger({
    exitOnError: false,
    level: 'debug',
    levels: myCustomLevels,
    colors: myCustomcolors,
    transports: transports
 });


 var log = logger.log;
 logger.log = function hijacked_log(level) {
     if (arguments.length > 1 && level in this) {
         log.apply(this, arguments);
     } else {
         var args = Array.prototype.slice.call(arguments);
         args.unshift('debug');
         log.apply(this, args);
     }
 };

 return logger;
}


function captureLogConsole (winstonLogger) {
  ['log', 'profile', 'startTimer'].concat(Object.keys(winstonLogger.levels)).forEach(function (method) {
    console[method] = function () {
      return winstonLogger[method].apply(winstonLogger, arguments);
    };
  });
  var log = console.log;
  console.log = function hijacked_log(level) {
      if (arguments.length > 1 && level in this) {
          log.apply(this, arguments);
      } else {
          var args = Array.prototype.slice.call(arguments);
          args.unshift('debug');
          log.apply(this, args);
      }
  };
};

/*
['log', 'profile', 'startTimer']
  .concat(Object.keys(logger.levels))
  .forEach(function (method) {
    console[method] = function () {
      return logger[method].apply(logger, arguments);
    };
  });
*/
/*
winston.extend(console);
// Since console.debug does not exist, we hijack console.log and
// write it to debug level.
// Ref: http://seanmonstar.com/post/56448644049/consolelog-all-the-things
var log = console.log;
console.log = function hijacked_log(level) {
    if (arguments.length > 1 && level in this) {
        log.apply(this, arguments);
    } else {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('debug');
        log.apply(this, args);
    }
};
*/

module.exports = {
  getLogger : getLogger,
  captureLogConsole:captureLogConsole,
  nullLogger:nullLogger
}
