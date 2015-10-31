"use strict";

var user, baseUrl, logged_in, navView, loginView, homeView;

////// MODELS //////////
var ChatUser = Backbone.Model.extend({
    defaults: {
        username: null,
        pic_url: null,
        resourceURI: null,
        unread_messages: 0,
    },
});

var ChatUserCollection = Backbone.Collection.extend({
    model: ChatUser
});

var ChatMessage = Backbone.Model.extend({
    defaults: {
        author: null,
        message: "",
        url: null,
        date: null,
    },
});

var ChatMessageCollection = Backbone.Collection.extend({
    model: ChatMessage
});

var PageFeedItem = Backbone.Model.extend({
    defaults: {
        username: null,
        pic_url: null,
        message: null,
        date: null,
        url: null,
    },
});

var PageFeedCollection = Backbone.Collection.extend({
    model: PageFeedItem
});

var Stats = Backbone.Model.extend({
    defaults: {
        my_time: 0,
        my_count: 0,
        total_time: 0,
        total_count: 0,
        my_dtime: 0,
        my_dcount: 0,
        total_dtime: 0,
        total_dcount: 0,
    }
});


/////// VIEWS /////////////

var PageFeedItemView = Backbone.View.extend({
    tagName: "div",
    className: "pagefeedline",
    render: function() {
        var username = this.model.get("username");
        var template = _.template($("#page-feed-template").html(), {
            "username": username,
            "user_url": getUserUrl(username),
            "pic_url": this.model.get("pic_url"),
            "message": this.model.get("message"),
            "hum_time": this.model.get("hum_time"),
        });

        this.$el.html(template);
        return this;
    },
});

var PageFeedCollectionView = Backbone.View.extend({
    tagName: "div",
    className: "pagefeedbox",
    render: function() {
        this.collection.each(function(message) {
            var messageView = new PageFeedItemView({
                model: message
            });
            this.$el.append(messageView.render().el);
        }, this);
        return this;
    }
});

var ChatUserView = Backbone.View.extend({
    tagName: "div",
    className: "chatuser_pic",
    render: function() {
        var username = this.model.get("username");
        var template = _.template($("#chat-user-template").html(), {
            "username": username,
            "user_url": getUserUrl(username),
            "pic_url": this.model.get("pic_url"),
            "old_level": this.model.get("old_level"),
            "time_ago": this.model.get("time_ago"),
        });

        this.$el.html(template);
        return this;
    },

    events: {
        "hover": "hoverUser"
    },

    hoverUser: function(event) {
        $(".chatuser_pic").css("cursor", "pointer");
    },
});

var ChatCollectionView = Backbone.View.extend({
    tagName: "div",
    className: "chatuser_row",

    render: function() {
        this.collection.each(function(person) {
            var userView = new ChatUserView({
                model: person
            });
            this.$el.append(userView.render().el);
        }, this);
        return this;
    }
});

var ChatMessageView = Backbone.View.extend({
    tagName: "div",
    className: "chatmessageline",
    render: function() {
        var date = this.model.get("date");
        var time_str = date.substring(0, 10) + " " + date.substring(11, 19) + " UTC";
        var time = new Date(time_str);
        var hum_time = moment(time).fromNow();
        var author = this.model.get("author");
        var message = this.model.get("message");
        var template;
        if (author === user.get("username")) {
            template = _.template($("#own-chat-msg-template").html(), {
                "message": message,
                "hum_time": hum_time,
            });
        } else {
            template = _.template($("#their-chat-msg-template").html(), {
                "author": author,
                "author_url": getUserUrl(author),
                "message": message,
                "hum_time": hum_time,
            });
        }
        this.$el.html(template);
        return this;
    },
});

var ChatMessageCollectionView = Backbone.View.extend({
    tagName: "div",
    className: "chatmessages",

    render: function() {
        this.collection.each(function(message) {
            var messageView = new ChatMessageView({
                model: message
            });
            this.$el.append(messageView.render().el);
        }, this);
        return this;
    }
});

var StatsView = Backbone.View.extend({
    tagName: "div",
    className: "stat_info",
    render: function() {

        var host = getUrlParser(window.g_url).host;
        var template = _.template($("#stats-template").html(), {
            "g_url": window.g_url,
            "my_count": this.model.get("my_count"),
            "my_time": this.model.get("my_time"),
            "total_count": this.model.get("total_count"),
            "total_time": this.model.get("total_time"),
            "host": host,
            "my_dcount": this.model.get("my_dcount"),
            "my_dtime": this.model.get("my_dtime"),
            "total_dcount": this.model.get("total_dcount"),
            "total_dtime": this.model.get("total_dtime"),
        });
        this.$el.html(template);
        return this;
    },
});


var LoginView = Backbone.View.extend({
    "el": $(".content-container"),

    initialize: function() {
        _.bindAll(this);
        this.render();
    },

    render: function() {
        if (!user.isLoggedIn()) {
            user.attemptLogin(function(username) {
                if (username !== null) {
                    completeLogin(username);
                }
            });
            $(".content-container").empty();
            $("body").css("width", "300px");
            $("body").css("height", "190px");
            var template = _.template($("#login_template").html(), {
                "baseUrl": baseUrl,
            });

            $(this.el).html(template);
            $("#errors").fadeOut();
            $("#id_username").focus();
        }
    },

    events: {
        "click #login": "getLogin",
        "keypress #id_username": "filterKey",
        "keypress #id_password": "filterKey"
    },

    filterKey: function(e) {
        if (e.which === 13) { // listen for enter event
            e.preventDefault();
            this.getLogin();
        }
    },

    getLogin: function() {
        $("#errors").fadeOut();
        $("#login").button("loading");
        var self = this;
        var username = $("#id_username").val();
        var g_username = username;
        var password = $("#id_password").val();
        if (username === "" || password === "") {
            self.displayErrors("Enter a username and a password");
        } else {
            if (user.getCSRF() !== "") {
                self.postLogin(user.getCSRF(), username, password);
            } else {
                $.get(getLoginUrl(), function(data) {
                    var csrf = parseCSRFToken(data);
                    if (csrf) {
                        user.setCSRF(csrf);
                        self.postLogin(csrf, username, password);
                    } else {
                        self.completeLogin(username);
                    }
                });
            }
        }
    },

    postLogin: function(csrfmiddlewaretoken, username, password) {
        var self = this;
        // now call the server and login
        $.ajax({
            url: getLoginUrl(),
            type: "POST",
            data: {
                "username": username,
                "password": password,
                "csrfmiddlewaretoken": csrfmiddlewaretoken,
                "remember_me": "on", // for convenience
            },
            dataType: "html",
            success: function(data) {
                var match = data.match(CSRF_REGEX);
                if (match) { // we didn"t log in successfully
                    self.displayErrors("Invalid username or password");
                } else {
                    completeLogin(username);
                }
            },
            error: function(data) {
                console.log(JSON.stringify(data));
                self.displayErrors("Unable to connect, try again later.");
            }
        });
    },

    logout: function() {
        $.get(getLogoutUrl());
        user.logout();
        backpage.clearLocalStorage("user");
        this.render();
        navView.render("home_tab");
    },

    displayErrors: function(errorMsg) {
        $("#login").button("reset");
        var $errorDiv = $("#errors");
        $errorDiv.html(errorMsg);
        $errorDiv.fadeIn();
    },

});


var NavView = Backbone.View.extend({
    "el": $(".nav-container"),

    initialize: function() {
        this.render("home_tab");
        $(".brand").blur();
    },

    render: function(tab) {
        $(".nav-container").empty();
        var loggedIn = user.isLoggedIn();
        var template = _.template($("#nav_template").html(), {
            baseUrl: baseUrl,
            loggedIn: loggedIn,
        });

        $(this.el).html(template);
        if (!loggedIn) {
            tab = "login_tab";
            $("#" + tab).addClass("active").click();
        }
        $("nav-tab").removeClass("active");
    },
});

var HomeView = Backbone.View.extend({
    "el": $(".content-container"),

    initialize: function() {
        this.render();
    },

    render: function() {
        if (!user.isLoggedIn()) {
            return;
        }
        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, function(tabs) {
            window.g_url = tabs[0].url;
            window.g_title = tabs[0].title;
            populateSubNav();
            populateStats();
            window.g_favIcon = tabs[0].favIconUrl;
            populateActiveUsers();
            window.setInterval(function() {
                populateActiveUsers();
            }, 12000);
            populateFeed(0);
            window.setInterval(function() {
                populateFeed(1);
            }, 12000);

            setupMessageBox();
            populateChatMessageBox(0);

            setupMentionAutocomplete();

            window.setInterval(function() {
                populateChatMessageBox(1);
            }, 12000);

        });

        var template = _.template($("#splash_template").html());
        $(this.el).html(template);
    },
});

function setupMentionAutocomplete() {
    $("textarea.mention").mentionsInput({
        onDataRequest: function(mode, query, callback) {
            var req_url = sprintf("%s/ext/getFriends?query=%s", baseUrl, query);
            $.getJSON(req_url, function(responseData) {
                callback.call(this, responseData.res);
            });
        }
    });
}

function completeLogin(username) {
    $("#login_container").remove();
    $("body").css("width", "400px");

    user.login();
    user.setUsername(username);

    navView.render("home_tab");
    homeView = new HomeView();
    //
    // Update user attributes in localStorage
    //
    user.getBlacklist().fetch({
        success: function(data) {
            user.saveState();
        }
    });
    user.getWhitelist().fetch({
        success: function(data) {
            user.saveState();
        }
    });
}

function setupMessageBox() {
    $("#messagebox")
        .focus(function() {
            if (this.value === this.defaultValue) {
                this.value = "";
            }
        })
        .blur(function() {
            if (this.value === "") {
                this.value = this.defaultValue;
            }
        });

    $("#messagebox").keypress(function(e) {
        if (e.which === 13) {
            var text = $("#upperarea .mentions").text();
            postMessage(text, window.g_url);
        }
    });

    $("#submitmessage").click(function(e) {
        var text = $("#upperarea .mentions").text();
        if (text === "") {
            text = null;
        }
        postMessage(text, window.g_url);
    });

}

function populateSubNav() {
    $("#userpic").empty().append("<a target='_blank' href='" + getUserUrl(user.get("username")) + "'><img class='img-rounded' src='" + baseUrl + "/ext/profilepic'></a>");

    $("#username").append(user.get("username"));

    $("#navSubLinks").append(" <a href='' id='incognito'></a> | ");

    $("#navSubLinks").append(" <a href='' id='mark_visit'>Mark visit to this page</a> | ");

    $("#navSubLinks").append("<a href='' id='whitelist'></a>");

    if (user.getIncognito() === true) {
        $("#incognito").html("<span class='red'>Whitelist Off</span>");
    } else {
        $("#incognito").html("<span class='green'>Whitelist On</span>");
    }


    if (user.inWhitelist(window.g_url)) {
        $("#whitelist").text("Domain is shared");
        $("#whitelist").css("cursor", "default");
        $("#whitelist").css("color", "#000000");
    } else {
        $("#whitelist").text("Share this domain");
    }

    $("#mark_visit").click(function(e) {
        e.preventDefault();
        postMessage(null, window.g_url, function(data) {
            $("#mark_visit").replaceWith("Page Marked");
        });
    });

    $("#incognito").click(function(e) {
        e.preventDefault();
        if (user.getIncognito() === false) {
            user.setIncognito(true);
            $("#incognito").html("<span class='red'>Whitelist Off</span>");
            $(".logo").attr("src", "/img/private.png");
            chrome.browserAction.setIcon({
                path: "/img/private.png"
            });
            chrome.browserAction.setBadgeText({
                "text": ""
            });
            emptyData();
        } else {
            user.setIncognito(false);
            $("#incognito").html("<span class='green'>Whitelist On</span>");
            $(".logo").attr("src", "/img/whitelist.png");
            chrome.browserAction.setIcon({
                path: "/img/whitelist.png"
            });
        }
    });

    $("#whitelist").click(function(e) {
        e.preventDefault();
        if ($("#whitelist").text() === "Share this domain") {
            var whitelist = user.getWhitelist();
            var uri = new URI(window.g_url);
            var hostname = uri.hostname;

            if (!user.inWhitelist(hostname)) {
                whitelist.create({
                    "url": hostname,
                    "user": user.getResourceURI(),
                });
            }

            postMessage(null, window.g_url, function() {
                $("#whitelist").text("Domain is shared");
                $("#whitelist").css("cursor", "default");
                $("#whitelist").css("color", "#000000");
            });
        }
    });

}


// populate chat message box
function populateChatMessageBox(first) {
    var message_text = getMessages(window.g_url);
    var parsed = JSON.parse(message_text).objects;
    var messages = [];
    $.each(parsed, function(index, value) {
        value.message = createMentionTag(value.message);
        messages.push(value);
    });
    if (messages.length !== 0) {
        var messages_coll = new ChatMessageCollection(messages);
        var messages_view = new ChatMessageCollectionView({
            collection: messages_coll
        });

        var c = messages_view.render().el;
        $("#chatmessage").empty().append(c);
    } else {
        $("#chatmessage").empty().append("No Chat Messages on this page.");
    }


    if (first === 0) {
        $("#chatmessage").scrollTop($("#chatmessage")[0].scrollHeight);

        $("#textbox").bind("enterKey", function(e) {
            var text = $("#lowerarea .mentions").text();
            postChatMessage(text, window.g_url);
        });
        $("#textbox").keyup(function(e) {
            if (e.keyCode === 13) {
                $(this).trigger("enterKey");
            }
        });
    }
}


// get all the stats for a page and domain and populate the view
function populateStats() {
    var tab_url = window.g_url;
    var title = window.g_title;
    var info = getStats(tab_url);
    var parsed = JSON.parse(info);
    var values = parsed.result;
    var stats = new Stats(values);
    var statview = new StatsView({
        model: stats
    });
    var c = statview.render().el;
    $("#stats").empty().append(c);
}


// get all the active users on a page and populate the view
function populateActiveUsers() {
    var tab_url = window.g_url;
    var text = getActiveUsers(tab_url);
    var parsed = JSON.parse(text);

    var users = parsed.result.page;
    var active_users = [];
    $.each(users, function(index, value) {
        active_users.push(value);
    });

    var dusers = parsed.result.domain;
    var active_dusers = [];
    $.each(dusers, function(index, value) {
        active_dusers.push(value);
    });

    if (active_users.length === 0 && active_dusers.length === 0) {
        $("#chatuserbox").empty().append("No one's been here recently");
        window.selected_user = null;
    } else {
        var page, domain, user_coll, user_view;
        if (active_users.length !== 0) {
            user_coll = new ChatUserCollection(active_users);
            user_view = new ChatCollectionView({
                collection: user_coll
            });
            var c = user_view.render().el;
            page = $("<div class='chattitle'>On this page:</div>").append(c);
        } else {
            page = "";
        }

        if (active_dusers.length !== 0) {
            user_coll = new ChatUserCollection(active_dusers);
            user_view = new ChatCollectionView({
                collection: user_coll
            });
            var d = user_view.render().el;
            domain = $("<div class='chattitle'>On this site:</div>").append(d);
        } else {
            domain = "";
        }

        $("#chatuserbox").empty().append(page).append(domain);
    }
}

// populate feed for a page
function populateFeed(first) {
    var tab_url = window.g_url;
    var text = getFeed(tab_url);
    var parsed = JSON.parse(text);
    var histories = parsed.result.messages;
    var feed_items = [];
    $.each(histories, function(index, value) {
        feed_items.push(value);
    });
    if (feed_items.length === 0) {
        $("#pagefeed").empty().append("No bulletins yet.");
    } else {
        var feed_coll = new PageFeedCollection(feed_items);
        var feed_view = new PageFeedCollectionView({
            collection: feed_coll
        });
        var c = feed_view.render().el;
        $("#pagefeed").empty().append(c);
    }
    if (first === 0) {
        $("#pagefeed").scrollTop(0);
    }
}

function clickHandle(e) {
    e.preventDefault();
    var a = $(e.target).closest("a");
    var url = $(e.target).closest("a")[0].href;
    if (url.indexOf("logout") !== -1) {
        loginView.logout();
    } else if (url.indexOf("http") !== -1) {
        backpage.openLink(url);
    } else if (url.indexOf("login") !== -1) {
        return;
    } else {
        url = url.split("#")[1];
        user.setTab(url);
        subNavView.render();
    }
}


////////////// AJAX CSRF PROTECTION///////////

/*
 * Ajax CSRF protection
 */
function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function sameOrigin(url) {
    // test that a given url is a same-origin URL
    // url could be relative or scheme relative or absolute
    var host = document.location.host; // host + port
    var protocol = document.location.protocol;
    var sr_origin = "//" + host;
    var origin = protocol + sr_origin;
    // Allow absolute or scheme relative URLs to same origin
    return (url === origin || url.slice(0, origin.length + 1) === origin + "/") ||
        (url === sr_origin || url.slice(0, sr_origin.length + 1) === sr_origin + "/") ||
    // or any other URL that isn"t scheme relative or absolute i.e relative.
    !(/^(\/\/|http:|https:).*/.test(url));
}

function ajaxSetup(csrftoken) {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type)) {
                // Send the token to same-origin, relative URLs only.
                // Send the token only if the method warrants CSRF protection
                // Using the CSRFToken value acquired earlier
                xhr.setRequestHeader("X-CSRFToken", csrftoken);
            }
        }
    });
}

///////////////////CHAT AND MESSAGE API CALLS///////////////////

/*
 * Get Activity Feed from server
 */

function getFeed(url) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/ext/getMessages?url=%s", baseUrl, encoded_url);
    return $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json",
        async: false
    }).responseText;
}

/*
 * Get active users from server
 */
function getActiveUsers(url) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/ext/getActiveUsers?url=%s", baseUrl, encoded_url);
    return $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json",
        async: false
    }).responseText;
}

/*
 * Get stats from server
 */
function getStats(url) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/ext/getStats?url=%s", baseUrl, encoded_url);
    return $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json",
        async: false
    }).responseText;
}


/* Post message to server
 */

function postMessage(message, url, successCallback) {
    var active_tab = getActiveTab();
    var req_url = sprintf("%s/api/v1/history-data", baseUrl);

    active_tab.user = user.getResourceURI();
    active_tab.src = "chrome";
    if (message !== null) {
        active_tab.message = message;
    }
    var data = JSON.stringify(active_tab);

    $.ajax({
        type: "POST",
        url: req_url,
        data: data,
        dataType: "text",
        processData: false,
        contentType: "application/json",
        error: function(jqXHR, textStatus, errorThrown) {
            logErrors(jqXHR, textStatus, errorThrown);
            loginView.logout();
        },
        success: function(data) {
            populateFeed(0);
            $("#messagebox").val("");
            $("#upperarea .mentions").html("<div></div>");
            $("#messagebox").blur();
            if (successCallback) {
                successCallback(data);
            }
        }
    });
}

/* Post chat message to server
 */

function postChatMessage(message, url) {
    var g_user = user.get("resourceURI");
    var req_url = sprintf("%s/api/v1/chatmessages", baseUrl);
    var date = moment();
    var data = {
        url: url,
        author: g_user,
        message: message,
        date: date,
    };
    data = JSON.stringify(data);
    $.ajax({
        type: "POST",
        url: req_url,
        data: data,
        dataType: "text",
        processData: false,
        contentType: "application/json",
        error: function(jqXHR, textStatus, errorThrown) {
            logErrors(jqXHR, textStatus, errorThrown);
            loginView.logout();
        },
        success: function(data) {
            populateChatMessageBox(1);
            $("#chatmessage").scrollTop($("#chatmessage")[0].scrollHeight);
            $("#textbox").val("");
            $("#lowerarea .mentions").html("<div></div>");
        }
    });

}

/*
 * Get info on the current tab open
 */

function getActiveTab() {
    var date_diff = 2; // minutes
    var curr_date = new Date();
    var end_date = new Date(curr_date.getTime() + date_diff * 60000);
    var total_time = date_diff * 60000;
    return {
        "url": window.g_url,
        "favIconUrl": window.g_favIcon,
        "title": window.g_title,
        "start_event": "user_push",
        "start_time": curr_date,
        "end_time": end_date,
        "total_time": total_time,
        "end_event": "user_push_end",
        "humanize_time": "2 minutes",
    };
}

/*
  Get Chat messages on a page
*/
function getMessages(url) {
    var encoded_url = encodeURIComponent(url);
    var req_url = sprintf("%s/api/v1/chatmessages?format=json&url=%s", baseUrl, encoded_url);
    return $.ajax({
        type: "GET",
        url: req_url,
        dataType: "json",
        async: false
    }).responseText;
}


$(document).ready(function() {
    window.backpage = chrome.extension.getBackgroundPage();
    user = backpage.user;

    logged_in = user.isLoggedIn();

    baseUrl = backpage.baseUrl;
    navView = new NavView();
    loginView = new LoginView(); // (presumably) calls initialization

    /////setup funcs///////
    chrome.cookies.get({
        "name": "csrftoken",
        "url": baseUrl
    }, function(cookie) {
        ajaxSetup(cookie.value);
    });

    if (logged_in) {
        homeView = new HomeView();
    }
    $("#home_tab").click(function() {
        if (homeView !== undefined) {
            $(document.html).css({
                "height": "550px"
            });
            homeView.render();
        }
    });
    $("a").click(clickHandle);
});
