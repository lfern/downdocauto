
$(function(){
  var Client = require('../lib/whatsapp_ipc').Client;
  var timerUpdateAuthImage = null;

  function disableTimerUpdate(){
    if (timerUpdateAuthImage != null){
      clearInterval(timerUpdateAuthImage);
      timerUpdateAuthImage = null;
    }
  }
  function start(){
    $('.page:visible').fadeOut('slow',function(){
      $('.channel-list').empty();
      $('.page-channel-list').fadeIn('slow',function(){
        client.getChannelList((success,channelsOrError) => {
          console.log(channelsOrError);
          if (success){
            for(var i=0;i<channelsOrError.length;i++){
              var e = channelsOrError[i];
              var $li = $('<li/>')
                .append($('<img/>').attr("src",e.image))
                .append($('<span/>').text(e.text));
              var $a = $('.channel-list');
              $a.append($li);
            }
          } else {
            alert(channelsOrError);
          }
        });    
      });
    });
  }

  function go2Auth(){
    $('.page:visible').fadeOut('slow',function(){
      $('.page-auth').fadeIn('slow',function(){
      });
    });
  }

  function go2Popup(info){
    $('.page:visible').fadeOut('slow',function(){
      $('.popup-content').text(info.text);
      $('.popup-buttons').empty();
      for(var i=0;i<info.buttons.length;i++){
        $('.popup-buttons').append($('button').attr('id',"btn-i").text(info.buttons[i]));
      }
      $('.page-popup').fadeIn('slow',function(){

      });
    });
    
  }

  function stop(){
    client.endBrowsing();
    $('.page:visible').fadeOut('slow',function(){
      $('.page-welcome').fadeIn('slow',function(){
      });    
    });
  }

  $('.btn-start').click((evt) => {
    evt.preventDefault();
    client.enable();
    client.startBrowsing((error) => {
      if (!error){
        start(); 
      } else {
        stop();
      }
    });
  });

  $('.btn-stop').click((evt) => {
    evt.preventDefault();
    disableTimerUpdate();
    stop();
  });
  try{
    var client = new Client();
    client.on('whatsapp-auth-required',(image)=>{
      $('.img-auth-img').attr('src',image);
      disableTimerUpdate();
      go2Auth();
      timerUpdateAuthImage = setInterval(() => {
        client.getUpdatedAuthImage((success,imageOrError)=>{
          if (success){
            if (imageOrError){
              $('.img-auth-img').attr('src',imageOrError);
            } else {
              client.requestAuthImageUpdate();
            }
          } else {
            console.log(imageOrError);
          }     
        })}, 1 * 1000);
    });
    
    client.on("whatsapp-invalid-state",()=>{
      console.log("invalid state");
      disableTimerUpdate();
      start();
    });

    client.on("whatsapp-popup",(info)=>{
      console.log("invalid state");
      disableTimerUpdate();
      go2Popup(info);
    });

  } catch (ex){
    console.trace();
    console.log(ex);
  }
});
