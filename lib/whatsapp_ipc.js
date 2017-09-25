'use strict'

const Nightmare = require('eramthgin');//require('nightmare');
var nightmare = null;

const {ipcMain} = require('electron')
const {ipcRenderer} = require('electron')
const EventEmitter = require('events');

const WHATSAPP_REQUEST_START = "whatsapp-request-start";
const WHATSAPP_REQUEST_STOP = "whatsapp-request-stop";

const WHATSAPP_REQUEST_CHANNELS = "whatsapp-request-channels";
const WHATSAPP_REQUEST_UPDATE_AUTH_IMAGE = "whatsapp-request-update-auth-image";
const WHATSAPP_REQUEST_AUTH_IMAGE_UPDATE = "whatsapp-request-auth-image-update";


const WHATSAPP_RESPONSE_START = "whatsapp-response-start";
const WHATSAPP_RESPONSE_STOP = "whatsapp-response-stop";

const WHATSAPP_RESPONSE_CHANNELS = "whatsapp-response-channels";
const WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE = "whatsapp-response-update-auth-image";
const WHATSAPP_RESPONSE_AUTH_IMAGE_UPDATE = "whatsapp-response-auth-image-update";

const WHATSAPP_EVENT_AUTH_REQUIRED = 'whatsapp-auth-required';
const WHATSAPP_EVENT_INVALID_STATE = 'whatsapp-invalid-state';
const WHATSAPP_EVENT_POPUP = 'whatsapp-popup';

const STATUS_NO       = 0;
const STATUS_AUTH     = 1;
const STATUS_LIST     = 2;
const STATUS_INACTIVE = 3;
const STATUS_POPUP    = 4;

function getStatus(){
  console.log("checking")
  var chatList = document.querySelector(".chatlist.infinite-list");
  if (chatList != null) return STATUS_LIST;
  var qrCode = document.querySelector(".qrcode img");
  if (qrCode != null) return STATUS_AUTH;

  return STATUS_NO;
}
function wait4AnyEntry(nightmare,cb){
  nightmare.wait(() => {
    var chatList = document.querySelector(".chatlist.infinite-list");
    if (chatList != null) return true;
    var qrCode = document.querySelector(".qrcode img");
    if (qrCode != null) return true;
    var popup = document.querySelector(".popup-container");
    if (popup != null) return true;
  
    return false;
  }).evaluate(()=>{
    var chatList = document.querySelector(".chatlist.infinite-list");
    if (chatList != null) return 2;
    var qrCode = document.querySelector(".qrcode img");
    if (qrCode != null) return 1;
    var popup = document.querySelector(".popup-container");
    if (popup != null) return 4;
  
    return 0;
  }).then(function(status){
    cb(true,status);
  }).catch(function(error){
    cb(false,error);
  });
}

class Server {
  
  static enable(){
    /**
     * Start browsing whatsapp
     */
    ipcMain.on(WHATSAPP_REQUEST_START,(event,handle) => {
      try {
        if (nightmare != null){
          nightmare.end().then(console.log);
        }
        nightmare = Nightmare({
          waitTimeout: 1000000 ,
          frame:true,
          show: true,
          openDevTools: true,
          webPreferences:{
            preload: require.resolve('../preload2.js'),
            backgroundThrottling: false,
            nodeIntegration:false
          }
        });
        nightmare
        .goto('https://web.whatsapp.com')
        .then(function(result){
          event.sender.send(WHATSAPP_RESPONSE_START, handle);
        }).catch(function(error){
          event.sender.send(WHATSAPP_RESPONSE_START, handle,error);
        });
      } catch (ex){
        event.sender.send(WHATSAPP_RESPONSE_START, handle,ex);
      }
    });
    /**
     * Stop browsing whatsapp
     */
    ipcMain.on(WHATSAPP_REQUEST_STOP,(event,handle) => {
      try{
        if (nightmare != null){
          nightmare.end().then(console.log);
          nightmare = null;
        } 
        event.sender.send(WHATSAPP_RESPONSE_STOP, handle);     
      } catch (ex){
        event.sender.send(WHATSAPP_RESPONSE_STOP, handle, ex);
      }
    });
    /**
     * Update auth image
     */
    ipcMain.on(WHATSAPP_REQUEST_UPDATE_AUTH_IMAGE,(event,handle)=>{
      if (nightmare == null){
        event.sender.send(WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE, handle,false);
        return;
      }
      nightmare.evaluate(()=>document.querySelector(".qrcode.qrcode-idle"))
      .then(function(result){
        if (result == null){
          nightmare.evaluate(() => {
            var d = document.querySelector('.qrcode img');
            if (d != null) return d.src;
            return null;
          }).then(function(result){
            if (result == null){
              event.sender.send(WHATSAPP_EVENT_INVALID_STATE);
              return;
            }
            event.sender.send(WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE, handle, true,result);
          }).catch(function(error){
            event.sender.send(WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE, handle, false,error);
          });
        } else {
          event.sender.send(WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE, handle, true);
        }
      }).catch(function(error){
        event.sender.send(WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE, handle, false,error);
      })
    });
    /**
     * request auth image update
     */
    ipcMain.on(WHATSAPP_REQUEST_AUTH_IMAGE_UPDATE,(event,handle)=>{
      if (nightmare == null){
        event.sender.send(WHATSAPP_RESPONSE_AUTH_IMAGE_UPDATE, handle,false);
        return;
      }
      //nightmare.evaluate(()=>document.querySelector(".qrcode .qr-button"))
      nightmare.evaluate(()=>{
        var element = document.querySelector(".qrcode .qr-container");
        console.log(element);
        if (element){
          element.click();
          return true;
        }
        return false;
        //document.querySelector(".qrcode .qr-container").click();
        
      })
      .then(function(result){
        console.log(result);
        if (result){
          //result.click();
          event.sender.send(WHATSAPP_RESPONSE_AUTH_IMAGE_UPDATE, handle,true);
        }
      }).catch(function(error){
        event.sender.send(WHATSAPP_RESPONSE_AUTH_IMAGE_UPDATE, handle, false,error);
      });
    });

    /**
     * Request channel list
     */
    ipcMain.on(WHATSAPP_REQUEST_CHANNELS, (event, handle) => {
      console.log("request");
      if (nightmare == null){
        event.sender.send(WHATSAPP_RESPONSE_CHANNELS, handle,false);
        return;
      }
      wait4AnyEntry(nightmare,(success,statusOrError)=>{
        if (success){
          if (statusOrError == STATUS_LIST){
            event.sender.send(WHATSAPP_RESPONSE_CHANNELS, handle,true,["1","2"]);
          } else if (statusOrError == STATUS_AUTH){
            nightmare.evaluate(()=>{
              document.querySelector('.qrcode img').src
            }).then(function(result){
              event.sender.send(WHATSAPP_EVENT_AUTH_REQUIRED, result);
            }).catch(function(error){
              event.sender.send(WHATSAPP_EVENT_INVALID_STATE);
            });
          } else if(statusOrError == STATUS_POPUP){
            nightmare.evaluate(()=>{
              var e = document.querySelector('.popup-contents');
              var s = (e.innerText || e.textContent);
              var buttons = [];
              var bs = document.querySelectorAll('.popup-controls .popup-controls-item');
              for(var i=0;i<bs.length;i++){
                e = bs[i];
                buttons.push((e.innerText || e.textContent));
              }
              return {text:s,buttons:bs};
            }).then(function(result){
              event.sender.send(WHATSAPP_EVENT_POPUP, result);
            }).catch(function(error){
              event.sender.send(WHATSAPP_EVENT_INVALID_STATE);
            });

          } else {
            event.sender.send(WHATSAPP_EVENT_INVALID_STATE);
          }
        } else {
          event.sender.send(WHATSAPP_RESPONSE_CHANNELS, handle,false,statusOrError);
        }
      });
/*
      nightmare
      .wait(".qrcode img")
      .evaluate(() =>
        document.querySelector('.qrcode img').src
      )
      //.end()
      .then(function (result) {
        console.log("OK!");
        event.sender.send(WHATSAPP_EVENT_AUTH_REQUIRED, result);
      })
      .catch(function (error) {
        console.error('Search failed:', error);
      });
*/
      
    })
  }
  static disable(){
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_START);
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_STOP);
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_UPDATE_AUTH_IMAGE);
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_CHANNELS);
  }
}
var handle = 1;
var callbacks = {};
class Client extends EventEmitter{
/*
    constructor (name, protein, carbs, fat) {
        this.name = name;
        this.protein = protein;
        this.carbs = carbs;
        this.fat = fat;
    }

    toString () {
        return `${this.name} | ${this.protein}g P :: ${this.carbs}g C :: ${this.fat}g F`
    }

    print () {
      console.log( this.toString() );
    }
    */
    static InvokeResponse(handle,args){
      if (callbacks.hasOwnProperty(handle)){
        var cb = callbacks[handle];
        delete callbacks[handle];
        cb.apply(this,args);
      }
    }
    static InvokeProxy(mesgId,cb,args){
      var h = null;
      if (cb){
        h = handle++;
        var timerid = setTimeout(() => {
          if (callbacks.hasOwnProperty(h)){
            delete callbacks[h];
          }
        }, 60 * 1000);
        callbacks[h] = function () {
          clearTimeout(timerid);
          cb.apply(this,arguments);
        };
      }
      var args = [mesgId,h].concat(args);
      ipcRenderer.send.apply(this,args);

    }
    constructor(){
      super();
      this.responseProxy = (event,handle,...restArguments) => {
        Client.InvokeResponse(handle,restArguments);
      };
/*
      this.responseChannelsFunction = (event, handle, list) => {
        InvokeResponse()
        if (callbacks.hasOwnProperty(handle)){
          var cb = callbacks[handle];
          delete callbacks[handle];
          cb(list);
        }
      }
*/
      this.eventAuthRequired = (event,image) => {
        this.emit(WHATSAPP_EVENT_AUTH_REQUIRED,image);
      };

      this.eventInvalidState = (event) => {
        this.emit(WHATSAPP_EVENT_INVALID_STATE);
      };
      
      this.eventPopup = (event) => {
        this.emit(WHATSAPP_EVENT_POPUP);
      }

    }
    enable(){
      // on list channels response
      ipcRenderer.on(WHATSAPP_RESPONSE_START,this.responseProxy);
      ipcRenderer.on(WHATSAPP_RESPONSE_STOP,this.responseProxy);
      ipcRenderer.on(WHATSAPP_RESPONSE_CHANNELS,this.responseProxy);
      ipcRenderer.on(WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE,this.responseProxy);     
      ipcRenderer.on(WHATSAPP_RESPONSE_AUTH_IMAGE_UPDATE,this.responseProxy);     
       
      // on auth required send image
      ipcRenderer.on(WHATSAPP_EVENT_AUTH_REQUIRED, this.eventAuthRequired);
      ipcRenderer.on(WHATSAPP_EVENT_INVALID_STATE,this.eventInvalidState);
      ipcRenderer.on(WHATSAPP_EVENT_POPUP,this.eventPopup);
    }
    disable(){
      ipcRenderer.removeListener(WHATSAPP_RESPONSE_START,this.responseProxy);
      ipcRenderer.removeListener(WHATSAPP_RESPONSE_STOP,this.responseProxy);
      ipcRenderer.removeListener(WHATSAPP_RESPONSE_CHANNELS,this.responseProxy);
      ipcRenderer.removeListener(WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE,this.responseProxy);
      ipcRenderer.removeListener(WHATSAPP_RESPONSE_AUTH_IMAGE_UPDATE,this.responseProxy);     

      ipcRenderer.removeListener(WHATSAPP_EVENT_AUTH_REQUIRED,this.eventAuthRequired);
      ipcRenderer.removeListener(WHATSAPP_EVENT_INVALID_STATE,this.eventInvalidState);
      ipcRenderer.removeListener(WHATSAPP_EVENT_POPUP,this.eventPopup);
    }
    startBrowsing(cb){
      Client.InvokeProxy(WHATSAPP_REQUEST_START,cb);
    }
    endBrowsing(cb){
      Client.InvokeProxy(WHATSAPP_REQUEST_STOP,cb);
    }
    getChannelList(cb){
      Client.InvokeProxy(WHATSAPP_REQUEST_CHANNELS,cb);
    }

    getUpdatedAuthImage (cb){
      Client.InvokeProxy(WHATSAPP_REQUEST_UPDATE_AUTH_IMAGE,cb);      
    }
    requestAuthImageUpdate(cb){
      Client.InvokeProxy(WHATSAPP_REQUEST_AUTH_IMAGE_UPDATE,cb);      
    }
}

module.exports = {
  Server : Server,
  Client: Client
};
