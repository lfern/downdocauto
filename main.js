const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')
const Server = require('./lib/whatsapp_ipc').Server;

const Nightmare = require('eramthgin');//require('nightmare');


process.on('uncaughtException', function(error) {
  var message = '[' + (new Date()).toISOString() + '] ' +
                error.stack + '\n' +
                Array(81).join('-') + '\n\n';

  //var userFolder = util.getUserFolder(elecApp.getName());
  //util.mkdirp(userFolder);
  //require('fs').appendFileSync(userFolder+'/tractisapp-error.log', message);
  console.error(message);
  app.quit();
});
/*
var winston = require('winston');
var logUtil = require("./lib/log");

// creamos el log general
var logger = new winston.Logger({
    level: 'debug',
    handleExceptions: true,
    humanReadableUnhandledException: true,
    transports: [
      new (winston.transports.Console)()//,
      //new (winston.transports.File)({ name:'history',filename: util.getUserFolder()+'/boot-history.log' })
    ]
  });
// capturamos todo el console.log

logUtil.captureLogConsole(logger);
*/
console.log("initializing...");


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  // Open the DevTools.
  win.webContents.openDevTools()

  //win.loadURL("https://web.whatsapp.com");
  
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'public/index.html'),
    protocol: 'file:',
    slashes: true
  }))


  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createWindow();
  Server.enable();
  //run2();
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
    Server.enable();
    //run2();
  }
})



function run() {
    var nightmare = Nightmare({
        gotoTimeout: 10000, // in ms
        loadTimeout: 10000, // in ms
        executionTimeout: 10000, // in ms
    });
    console.log('test start');

    const n = nightmare.goto('http://www.google.com')
        .end()
        .then(function (result) {
            console.log('test done', result);
        })
        .catch(function (error) {
            console.error('test failed:', error);
        });

    console.log('test running', n);
    return n;
}
function run2(){
  var nightmare = Nightmare({ show: true });
  nightmare
  .goto('https://duckduckgo.com')
  .type('#search_form_input_homepage', 'github nightmare')
  .click('#search_button_homepage')
  .wait('#zero_click_wrapper .c-info__title a')
  .evaluate(function () {
    return document.querySelector('#zero_click_wrapper .c-info__title a').href;
  })
  .end()
  .then(function (result) {
    console.log("OK!");
    console.log(result);
  })
  .catch(function (error) {
    console.error('Search failed:', error);
  });
}
