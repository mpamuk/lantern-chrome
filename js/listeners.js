"use strict";

// Interesting events:
// When an active tab is selected
// When a new page is navigated to (must filter for bad urls)
// When a new window is opened/selected (same as tab event)
// When a tab or window is destroyed
// API info: http://developer.chrome.com/extensions/tabs.html

///////////////Event listeners///////////////
/*
    Specific to Chrome. Each calls the data processor function in main.js to be processed and recorded if necessary.
    The handler checks for things like restricted sites and user permissions that are set.
    This allows firefox to use the same main.

    Fires when the active tab in a window changes.
    Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events
    to be notified when a URL is set.

    We need to listen for both (so we know when new tabs/windows appear). But no double counting.
*/
function activeTabListener() {
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        var eventType = "focus";
        openTab(activeInfo.tabId, eventType);
    });
}

/*
    Fired when a tab is updated.
*/
function updatedTabListener() {
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        var eventType = "update";
        openTab(tabId, eventType);
    });
}

/*
    Fired when a tab is closed.
*/
function removedTabListener() {
    chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
        var eventType = "destroy";
        closeTab(tabId, eventType);
    });
}

/*
    Fired when window focus has changed
*/
function focusedWindowListener() {
    chrome.windows.onFocusChanged.addListener(function(windowId) {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            var eventType = "blur";
            if (activeItem !== undefined) {
                closeTab(activeItem.tabId, eventType);
            }
        } else {
            chrome.tabs.query({
                active: true,
                currentWindow: true
            }, function(tabArray) {
                var activeTab = getActiveTab(tabArray);
                if (activeTab !== null) {
                    var eventType = "focus";
                    openTab(activeTab.id, eventType);
                }
            });
        }

    });
}


/*
    Helper function to get the tab with tabId and open the item
*/
function openTab(tabId, eventType) {
    chrome.tabs.get(tabId, function(tab) {
        console.log("OPEN TAB");
        console.log("TAB STATUS " + tab.status);
        if (isValidTab(tab) && tab.status === "complete") {
            openItem(tabId, tab.url, tab.favIconUrl, tab.title, eventType);
        }

    });
}

/*
    Helper function to get the tab with tabId and close the item
*/
function closeTab(tabId, eventType) {
    chrome.tabs.get(tabId, function(tab) {
        if (isValidTab(tab)) {
            console.log("CLOSE TAB");
            closeItem(tab.id, tab.url, eventType, false);
        }
    });
}

/*
    Fired when the window is closed. Writes all data to local_storage
*/
function closedWindowListener() {
    chrome.windows.onRemoved.addListener(function() {
        localStorage.local_history = JSON.stringify(local_history);
        localStorage.user = JSON.stringify(user);
    });
}

//////////////////Content-script to Background script listener//////////////////

/*
    Listen to messages between the content and background script.
*/
function messageListener() {
    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        executeMessage(request, sender, sendResponse);
        return true;
    });
}

/*
    helper to execute messages between content and background script
*/
function executeMessage(request, sender, sendResponse) {
    var msg = JSON.parse(request);
    var action = msg.action;
    var ACTION_MAP = {
        "idle": [handleIdleMsg, msg, sender.tab.id],
        "filterlist": [handleFilterListMsg, msg],
        "login": [handleLoginMsg],
        "ignore": [handleIgnoreMsg],
        "nag": [handleNagMsg, msg.url],
    };

    if (action in ACTION_MAP) {
        var args = ACTION_MAP[action]; //get mapped function and args

        args[0].apply(this, args.slice(1)); //apply func with args
    }
}

/*
    run each listener type
*/
function runListeners() {
    activeTabListener();
    updatedTabListener();
    removedTabListener();
    focusedWindowListener();
    closedWindowListener();
    messageListener();
}

/*
 * Check for `chrome.runtime.lastError` when querying for tabs
 */
function isValidTab(tab) {
    console.log("IS VALID TAB");
    console.log(!chrome.runtime.lastError);
    console.log("TAB DEFINED " + tab!==undefined);
    return !chrome.runtime.lastError && tab !== undefined;
}

$(document).ready(function() {
    runListeners();
});
