const Nightmare = /*require('eramthgin');*/require('nightmare');

function a(){
  const nightmare = Nightmare({waitTimeout: 1000000 , show: true });
  nightmare
  .goto('https://web.whatsapp.com')
  //.goto('http://google.com')
  .wait('#zero_click_wrapper .c-info__title a')
  .end()
  .then(function (result) {
    console.log("OK!");
    console.log(result);
  })
  .catch(function (error) {
    console.error('Search failed:', error);
  });
}

const getAddress = async id => {
  console.log(`Now checking ${id}`);
  const nightmare = new Nightmare({ show: true });
// Go to initial start page, navigate to Detail search
  try {
    await nightmare
      .goto('https://web.whatsapp.com')
      .wait('.bodylinkcopy:first-child')
      .click('.bodylinkcopy:first-child');
  } catch(e) {
    console.error(e);
  }
}
getAddress()
