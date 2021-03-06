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
const WHATSAPP_REQUEST_DOWNLOAD_CONTACT = "whatsapp-request-download-contact";


const WHATSAPP_RESPONSE_START = "whatsapp-response-start";
const WHATSAPP_RESPONSE_STOP = "whatsapp-response-stop";

const WHATSAPP_RESPONSE_CHANNELS = "whatsapp-response-channels";
const WHATSAPP_RESPONSE_UPDATE_AUTH_IMAGE = "whatsapp-response-update-auth-image";
const WHATSAPP_RESPONSE_AUTH_IMAGE_UPDATE = "whatsapp-response-auth-image-update";
const WHATSAPP_RESPONSE_DOWNLOAD_CONTACT = "whatsapp-response-download-contact";

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

function doScrollChatList(nightmare,cb){
    nightmare.wait(1000)
    .evaluate(()=>{
      // scroll down
      var n1 = document.querySelector(".chatlist-panel-body");
      if (n1.scrollTop + n1.clientHeight == n1.scrollHeight){
        return true;
      }
      n1.scrollTop = n1.scrollTop + n1.clientHeight;
      if (n1.crollTop > n1.scrollHeight){
        n1.scrollTop = n1.scrollHeight;
      }
      return false;
    }).then((result)=>{
      if (result){
        cb();
      } else {
        doScrollChatList(nightmare,cb);
      }
    }).catch((error)=>{
      cb(error)
    });
}
class Contact{
  constructor(id,imgSrc,name,zIndex){
    this.id = id;
    this.imgSrc = imgSrc;
    this.name = name;
    this.zIndex = zIndex;
  }
  isEqual(c){
    if (!(c instanceof Contact)){
      return false;
    }
    if (this.id != null && this.id === c.id){
      return true;
    }
    if (this.name === c.name){
      return true;
    }
    return false;
  }
}
class ContactList{
  constructor(){
    this.list = [];
    this.ids = [];
    this.names = [];
  }
  concat(newList){
    for(var i=0;i<newList.length;i++){
      var c = newList[i];
      if (!(c instanceof Contact)){
        c = new Contact(c.id,c.image,c.text,c.zindex);
      }
      if (c.id != null){
        if (this.ids.indexOf(c.id) != -1){
          continue;
        }
        this.list.push(c);
        this.ids.push(c.id);
      } else {
        if (this.names.indexOf(c.name) != -1){
          continue;
        }
        this.list.push(c);
        this.names.push(c.name);
      }
    }
  }
}

function getDataImageFromUrl(nightmare,cb){
  nightmare.wait(()=>{
    return (window.__dataImage != null);
  }).evaluate(()=>{
    return window.__dataImage;
  }).then((result)=>{
    cb(true,result);
  }).catch((error)=>{
    cb(false,error);
  });
}
function invokeDataImageFromUrl(nightmare,imageUrl,cb){
  nightmare.evaluate((imageUrl)=>{
    window.__dataImage = null;
    window.__getDataUri(imageUrl,(image)=>{
      window.__dataImage = image;
    },49,49);
  },imageUrl).then((result)=>{
    getDataImageFromUrl(nightmare,(success,image)=>{
      cb(true,image);
    });
  }).catch((error)=>{
    cb(false,error);
  })
}
const IN_PANE_MEDIA_VIEWER = 0;
const IN_PANE_INFO = 1;
const IN_PANE_INFO_WAIT = 2;
const IN_PANE_INFO_EMPTY = 3;
const IN_PANE_CHAT = 4;

function ensureInMediaViewer(nightmare,cb){

  nightmare.wait(1000)
  .evaluate(()=>{
    var mvPane = document.querySelector(".media-viewer");
    var iPane = document.querySelector(".pane-three .flow-drawer-container");
    var cPane = document.querySelector("#main header .chat-body");
    if (mvPane != null){
      // estamos en mediaviewer
      return 0;
    } else if (iPane != null){
      // estamos mostrando el info
      //document.querySelector(".row-main.row-main-ellipsify").click();
      var im = document.querySelector(".pane-three .media-gallery .media-canvas");
      var imEmpty = document.querySelector(".pane-three .media-gallery.media-gallery-empty");
      if (im == null){
        if (imEmpty == null){
          return 2;
        } else {
          return 3;
        }
      } else {
        im.click();
        return 1;
      }
    } else if (cPane != null){
      // estamos mostrando el chat
      //window.__triggerMouseEvent(cPane,"mousedown");
      cPane.click();
      return 4
    } else {
      return -1;
    }
  }).then((result) => {
    if (result == IN_PANE_MEDIA_VIEWER){
      cb(true);
    } else if (result == IN_PANE_INFO){
      ensureInMediaViewer(nightmare,cb);
    } else if (result == IN_PANE_INFO_WAIT){
      nightmare.wait(()=>{
        debugger;
        if (document.querySelector(".pane-three .media-gallery .media-canvas") != null){
          return true;
        } else if (document.querySelector(".pane-three .media-gallery.media-gallery-empty") != null){
          return true;
        } else {
          return false;
        }
      }).then((result)=>{
        ensureInMediaViewer(nightmare,cb);  
      }).catch((error)=>{
        cb(false,error);
      });
    } else if (result == IN_PANE_INFO_EMPTY){
      cb(false);
    } else if (result == IN_PANE_CHAT){
      ensureInMediaViewer(nightmare,cb);
    } else {
      cb(false);
    }
  }).catch((error)=>{
    cb(false,error);
  });

}  
function x(){


  // lista de thumbs
  ".media-collection.media-viewer-thumbs-container"
  // a la izquierda
  document.querySelector(".media-viewer-thumbs").scrollLeft = 0
  // is loading media
  ".media-thumb-spinner.media-thumb svg"
}

function clickOnContact(nightmare,c,cb){
  nightmare.wait(1000)
  .evaluate((id,name,zindex)=>{
    
    var n = document.querySelectorAll(".infinite-list-item");// .chat");
    for(var i=0;i<n.length;i++){
      var node = n[i];
      var e = node.querySelector(".chat-main .chat-title span");
      var img = node.querySelector(".avatar-image");
      var css = window.getComputedStyle(node);

      var element = {zindex:null,text:"",image:"",id:null};
      if (css.hasOwnProperty("z-index")){
        zindex = css["z-index"];
      }
      if (e != null){
        element.text = (e.innerText || e.textContent);
      }
      if (img != null){
        element.image = img.src;
        var urlParams = new URLSearchParams(img.src);
        element.id = urlParams.get('u');
      }
      if (id != null && id == element.id){ 
        //triggerMouseEvent (node, "mousedown");
        x = node.querySelector(".chat");
        window.__triggerMouseEvent (x, "mousedown");
        
        return {found:true};
      }
      
    }

    var n1 = document.querySelector(".chatlist-panel-body");
    if (n1.scrollTop == 0){
      return {found:false,next:false};
    }
    n1.scrollTop = n1.scrollTop - n1.clientHeight;
    if (n1.crollTop < 0){
      n1.scrollTop = 0;
    }
    return {found:false,next:true};
  },c.id,c.name,c.zindex)
  .then((result)=>{
    if (result.found){
      cb(true); 
    } else if (result.next){
      clickOnContact(nightmare,c,cb);
    } else {
      cb(false);
    }
  }).catch((error)=>{
    cb(false,error);
  })
}
function closeMediaViewerIfOpened(nightmare,cb){
  nightmare.evaluate(()=>{
    var mv = document.querySelector('.media-viewer span[data-icon="x-viewer"]');
    if (mv != null){
      //mv.closest("div").click();
      mv.click();
    }
  }).then((result)=>{
    cb(true);
  }).catch((error)=>{
    cb(false,error);
  });
}
function goToDownloadImages(nightmare,c,cb){
  closeMediaViewerIfOpened(nightmare,(success,error)=>{
    if (!success){
      cb(false,error);
      return;
    }
    nightmare.evaluate(()=>{
      var mv = document.querySelector('.media-viewer span[data-icon="x-viewer"]');
      if (mv != null){
        //mv.closest("div").click();
        mv.click();
      }
    }).wait(1000).evaluate(()=>{
      var n1 = document.querySelector(".chatlist-panel-body");
      n1.scrollTop = n1.scrollHeight;
      return true;
    }).wait(1000).then((result)=>{
      clickOnContact(nightmare,c,(success,error)=>{
        if (!success){
          cb(false,error);
        } else {
          ensureInMediaViewer(nightmare,(success,error)=>{
            if (success){
              cb(true);
            } else {
              cb(false,error);
            }
          });
    
          /*
          nightmare.wait(1000).wait(".main header .avatar")
          .then((result)=>{
            cb();
          }).catch((error)=>{
            cb(error);
          });
          */
        }
      });
    }).catch((error)=>{
      cb(false,error);
    });
  });
}

function getNextContacts(nightmare,cb,contactList){
  if (!(contactList instanceof ContactList)){
    contactList = new ContactList();
  }
  nightmare.wait(1000)
  .evaluate(()=>{
    var n = document.querySelectorAll(".infinite-list-item");// .chat");
    var l = [];
    for(var i=0;i<n.length;i++){
      var node = n[i];
      var e = node.querySelector(".chat-main .chat-title span");
      var img = node.querySelector(".avatar-image");
      var css = window.getComputedStyle(node);
      //https://dyn.web.whatsapp.com/pp?t=s&u=34617220063%40c.us&i=1506419240&e=https%3A%2F%2Fpps.whatsapp.net%2Fv%2Ft61.11540-24%2F21816690_296872157460604_6861814226546065408_n.jpg%3Foe%3D59CE198B%26oh%3D6fa2140c3136ac0d16ecf7178e7518e9&ref=1%402dcTSQF0d7JWg07Tx08BFd6How%2BKoTzVJQ9RU6LB%2FX7WXTwGvMUmHj5d&tok=1%40PU48KteotD9nxVkU%2FVV2vJTZM5yTtlaQDc0fiIqKZZk3xk2%2FV2hT2w3tawGeUZoQnSSx0YQ25x8P8A%3D%3D
      //https://dyn.web.whatsapp.com/pp?t=s&u=34636379697-1406662777%40g.us&i=1470405374&e=https%3A%2F%2Fpps.whatsapp.net%2Fv%2Ft61.11540-24%2F16488356_705792846265989_1977882566371311616_n.jpg%3Foe%3D59CE198B%26oh%3Dea1ab599135c694a220ba60e5e51cba0&ref=1%402dcTSQF0d7JWg07Tx08BFd6How%2BKoTzVJQ9RU6LB%2FX7WXTwGvMUmHj5d&tok=1%40PU48KteotD9nxVkU%2FVV2vJTZM5yTtlaQDc0fiIqKZZk3xk2%2FV2hT2w3tawGeUZoQnSSx0YQ25x8P8A%3D%3D

      var element = {zindex:null,text:"",image:"",id:null};
      if (css.hasOwnProperty("z-index")){
        zindex = css["z-index"];
      }
      if (e != null){
        element.text = (e.innerText || e.textContent);
      }
      if (img != null){
        element.image = img.src;
        var urlParams = new URLSearchParams(img.src);
        element.id = urlParams.get('u');
      }
      l.push(element)
    }
    var n1 = document.querySelector(".chatlist-panel-body");
    if (n1.scrollTop == 0){
      return {next:false,list:l};
    }
    n1.scrollTop = n1.scrollTop - n1.clientHeight;
    if (n1.crollTop < 0){
      n1.scrollTop = 0;
    }
    return {next:true,list:l};
  }).then((result)=>{
    contactList.concat(result.list);
    if (result.next){
      getNextContacts(nightmare,cb,contactList);
    } else {
      //cb(true,contactList.list);
      // convert images url to data url
      convertImagesToDataUrl(nightmare,contactList.list,(list)=>{
        cb(true,list);
      });
      
    }
  }).catch((error)=>{
    cb(false,error);
  })
}

function convertImagesToDataUrl(nightmare,contactList,cb){
  var currentIndex = 0;
  function nextImage(){
    if (currentIndex == contactList.length){
      cb(contactList);
      return;
    }
    var c = contactList[currentIndex];
    currentIndex++;
    if (c.imgSrc == null){
      nextImage();
    } else {
      invokeDataImageFromUrl(nightmare,c.imgSrc,(success,image)=>{
        if (success && image != ""){
          c.imgSrc = image;
        } else {
          c.imgSrc = null;
        }
        nextImage();
      });
    }
  }
  nextImage();
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
          waitTimeout: 60000 ,
          frame:true,
          show: true,
          openDevTools: true,
          webPreferences:{
            alwaysOnTop :false,
            preload: require.resolve('../preload2.js'),
            backgroundThrottling: false,
            nodeIntegration:false,
            partition:'persist:main'
          }
        });
        nightmare
        .goto('https://web.whatsapp.com')
        //.inject('js', 'inject_utils.js')
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
            doScrollChatList(nightmare,(error)=>{
              getNextContacts(nightmare,(success,listOrError)=>{
                console.log(listOrError);
                if (success){
                  event.sender.send(WHATSAPP_RESPONSE_CHANNELS, handle,true,listOrError);
                } else {
                  event.sender.send(WHATSAPP_RESPONSE_CHANNELS, handle, false,listOrError);
                }
              });
              /*
              console.log(error);
              nightmare.wait(1000)
              .evaluate(()=>{
                  var n = document.querySelectorAll(".infinite-list-item .chat");
                  var l = [];
                  for(var i=0;i<n.length;i++){
                    var node = n[i];
                    var e = node.querySelector(".chat-main .chat-title span");
                    var img = node.querySelector(".avatar-image");
                    //https://dyn.web.whatsapp.com/pp?t=s&u=34617220063%40c.us&i=1506419240&e=https%3A%2F%2Fpps.whatsapp.net%2Fv%2Ft61.11540-24%2F21816690_296872157460604_6861814226546065408_n.jpg%3Foe%3D59CE198B%26oh%3D6fa2140c3136ac0d16ecf7178e7518e9&ref=1%402dcTSQF0d7JWg07Tx08BFd6How%2BKoTzVJQ9RU6LB%2FX7WXTwGvMUmHj5d&tok=1%40PU48KteotD9nxVkU%2FVV2vJTZM5yTtlaQDc0fiIqKZZk3xk2%2FV2hT2w3tawGeUZoQnSSx0YQ25x8P8A%3D%3D
                    //https://dyn.web.whatsapp.com/pp?t=s&u=34636379697-1406662777%40g.us&i=1470405374&e=https%3A%2F%2Fpps.whatsapp.net%2Fv%2Ft61.11540-24%2F16488356_705792846265989_1977882566371311616_n.jpg%3Foe%3D59CE198B%26oh%3Dea1ab599135c694a220ba60e5e51cba0&ref=1%402dcTSQF0d7JWg07Tx08BFd6How%2BKoTzVJQ9RU6LB%2FX7WXTwGvMUmHj5d&tok=1%40PU48KteotD9nxVkU%2FVV2vJTZM5yTtlaQDc0fiIqKZZk3xk2%2FV2hT2w3tawGeUZoQnSSx0YQ25x8P8A%3D%3D
          
                    var element = {text:"",image:"",id:""};
                    if (e != null){
                      element.text = (e.innerText || e.textContent);
                    }
                    if (img != null){
                      element.image = img.src;
                      var urlParams = new URLSearchParams(img.src);
                      element.id = urlParams.get('u');
                    }
                    l.push(element)
                  }
                  n[n.length-1].scrollIntoView();
                  return l;
              }).then((result)=>{
                event.sender.send(WHATSAPP_RESPONSE_CHANNELS, handle,true,result);
              }).catch((error)=>{
                event.sender.send(WHATSAPP_EVENT_INVALID_STATE);
              });
              */
            });
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
      
    });
    ipcMain.on(WHATSAPP_REQUEST_DOWNLOAD_CONTACT, (event, handle, c) => {
      if (nightmare == null){
        event.sender.send(WHATSAPP_RESPONSE_DOWNLOAD_CONTACT, handle,false);
        return;
      }
      goToDownloadImages(nightmare,new Contact(c.id,c.imgSrc,c.name,c.zindex),()=>{
        event.sender.send(WHATSAPP_RESPONSE_DOWNLOAD_CONTACT, handle,true);
      });
    });
  }
  static disable(){
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_START);
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_STOP);
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_UPDATE_AUTH_IMAGE);
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_CHANNELS);
    ipcMain.removeAllListeners(WHATSAPP_REQUEST_DOWNLOAD_CONTACT);
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
      ipcRenderer.on(WHATSAPP_RESPONSE_DOWNLOAD_CONTACT,this.responseProxy);     
       
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
      ipcRenderer.removeListener(WHATSAPP_RESPONSE_DOWNLOAD_CONTACT,this.responseProxy);     

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
    downloadContact(cb,c){
      Client.InvokeProxy(WHATSAPP_REQUEST_DOWNLOAD_CONTACT,c,cb);      
    }
}

module.exports = {
  Server : Server,
  Client: Client,
  Contact : Contact
};
