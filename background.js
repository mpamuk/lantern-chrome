
var successURL = 'https://www.facebook.com/connect/login_success.html';
successURL = 'http://lantern-app.herokuapp.com/?#';
function onFacebookLogin() {
                console.log("ON FB LOGIN");
                var firstTime = true;
                console.log(localStorage.accessToken);
                if (firstTime || localStorage.accessToken == undefined) {
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
