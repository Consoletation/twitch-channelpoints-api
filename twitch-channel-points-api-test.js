// ==UserScript==
// @name         Twitch Channel Points Event Hander
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Attempts to make the channel points API
// @author       Dan Porter <dan@consoletation.uk>
// @match        https://www.twitch.tv/popout/stealthct/chat
// @grant        none
// ==/UserScript==
'use strict';

function getChatNode() {
    var promiseResolve, promiseReject;
    var promise = new Promise(function(resolve, reject) {
        promiseResolve = resolve;
        promiseReject = reject;
    });
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (!mutation.addedNodes) return

            for (var i = 0; i < mutation.addedNodes.length; i++) {
                var node = mutation.addedNodes[i];
                if (node.className.includes('simplebar-scroll-content')) {
                    var wrap = node.getElementsByClassName('simplebar-content')[0];
                    var chatList = wrap.getElementsByClassName('chat-list__list-container')[0];
                    observer.disconnect();
                    promiseResolve(chatList);
                }
            };
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
    return promise;
}

// Runtime

(getChatNode())
.then(function(node) {
    console.log("DEBUG Consoletation channel points API handler activated!");
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (!mutation.addedNodes) return

            for (var i = 0; i < mutation.addedNodes.length; i++) {
                var node = mutation.addedNodes[i];
                if (node.tagName == 'DIV' && !node.className) {
                    var pointsRedemption = node.getElementsByClassName('channel-points-reward-line')[0].firstChild;
                    if (pointsRedemption && pointsRedemption.hasChildNodes) {
                        var pointsComponents = pointsRedemption.childNodes;
                        var bits = pointsComponents[0].textContent.split(" redeemed ");
                        var user = bits[0];
                        var reward = bits[1];
                        var cost = parseInt(pointsComponents[2].textContent.replace(/[,\.]/g, ''));
                        var redemption = {
                            user: user,
                            reward: reward,
                            cost: cost
                        }
                        console.log("DEBUG Redemption:", redemption);
                    };
                };
            };
        });
    });
    observer.observe(node, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    });
})
