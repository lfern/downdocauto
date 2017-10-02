window.__nightmare = {};

window.__triggerMouseEvent = function(node, eventType) {
  var clickEvent = document.createEvent ('MouseEvents');
  clickEvent.initEvent (eventType, true, true);
  node.dispatchEvent (clickEvent);
}
window.__getDataUri = function(url, callback,w,h) {
  var image = new Image();

  image.onload = function () {
      var canvas = document.createElement('canvas');
      if (w && h && Number.isInteger(w) && Number.isInteger(h)){
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(this, 0, 0,this.naturalWidth,this.naturalHeight,
          0,0,w,h);
      } else {
        canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
        canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size
        canvas.getContext('2d').drawImage(this, 0, 0);
      }

      

      // Get raw image data
      callback(canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, ''));

      // ... or get as Data URI
      callback(canvas.toDataURL('image/png'));
  };
  image.onerror = function(){
    callback("");
  }
  image.src = url;
}
window.__dataImage = null;



__nightmare.ipc = require('electron').ipcRenderer;
__nightmare.sliced = require('sliced');

// Listen for error events
window.addEventListener('error', function(e) {
  __nightmare.ipc.send('page', 'error', e.message, (e.error || {}).stack || '');
});

(function(){
  // prevent 'unload' and 'beforeunload' from being bound

  var defaultAddEventListener = window.addEventListener;
  window.addEventListener = function (type) {
    if (type === 'unload' || type === 'beforeunload') {
      return;
    }
    defaultAddEventListener.apply(window, arguments);
  };
/*
  // prevent 'onunload' and 'onbeforeunload' from being set
  Object.defineProperties(window, {
    onunload: {
      enumerable: true,
      writable: false,
      value: null
    },
    onbeforeunload: {
      enumerable: true,
      writable: false,
      value: null
    }
  });
*/
  // listen for console.log
  var defaultLog = console.log;
  console.log = function() {
    __nightmare.ipc.send('console', 'log', __nightmare.sliced(arguments));
    return defaultLog.apply(this, arguments);
  };

  // listen for console.warn
  var defaultWarn = console.warn;
  console.warn = function() {
    __nightmare.ipc.send('console', 'warn', __nightmare.sliced(arguments));
    return defaultWarn.apply(this, arguments);
  };

  // listen for console.error
  var defaultError = console.error;
  console.error = function() {
    __nightmare.ipc.send('console', 'error', __nightmare.sliced(arguments));
    return defaultError.apply(this, arguments);
  };

  // overwrite the default alert
  window.alert = function(message){
    __nightmare.ipc.send('page', 'alert', message);
  };

  // overwrite the default prompt
  window.prompt = function(message, defaultResponse){
    __nightmare.ipc.send('page', 'prompt', message, defaultResponse);
  }

  // overwrite the default confirm
  window.confirm = function(message, defaultResponse){
    __nightmare.ipc.send('page', 'confirm', message, defaultResponse);
  }
})()
