
var successURL = 'https://www.facebook.com/connect/login_success.html';
successURL = 'http://localhost:3000/?#';
function onFacebookLogin() {
                console.log("ON FB LOGIN");
                var firstTime = true;
                console.log(localStorage.accessToken);
                if (firstTime || localStorage.accessToken == undefined) {
                  //http://localhost:3000/?#access_token=CAAM0syS2XLwBAC9bnEjHVOpN3vnhtKeLvNGkq…9KHSAgypkRiVZAUTsTxbfr0ZAX3aaOD5aFxF0ZAcThTsSzubDTnKYZD&expires_in=5174327
                    console.log("COMING TO NULL ACCESS TOKEN");
                    chrome.tabs.getAllInWindow(null, function(tabs) {
                        for (var i = 0; i < tabs.length; i++) {
                            console.log(tabs[i].url);
                            if (tabs[i].url.indexOf(successURL) == 0) {
                                var params = tabs[i].url.split('#')[1];
				access = params.split('&')[0]
                                console.log(access);
                                localStorage.accessToken = access;
                                chrome.tabs.onUpdated.removeListener(onFacebookLogin);
                                return;
                            }
                        }
                    });
                }
                else {
                  console.log("WHAT THE HELL");
                }
            }
            chrome.tabs.onUpdated.addListener(onFacebookLogin);
