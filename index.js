// Configurable
const rewards = {
    'Send Message': async function (redemption) {
        console.log(
            `DEBUG sending message: ${redemption.response} from ${redemption.userName}!`
        )
        return Promise.resolve(true)
    },
    pass: async function (redemption) {
        console.log(`DEBUG Congrats ${redemption.userName}!`)
        return Promise.resolve(true)
    },
    fail: async function (redemption) {
        console.log(`DEBUG this was made to fail, ${redemption.userName}...`)
        return Promise.resolve(false)
    }
}

// Application
const ctPointsContainerObserver = new MutationObserver(findRewardContainer)
const ctPointsRewardObserver = new MutationObserver(filterDOMInsertionEvents)

// runs when the DOM is ready
$().ready(() => {
    console.log('Channel Points Handler Loaded. Now listening for rewards')
    // get the reward container
    ctPointsContainerObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    })
})

// find reward container from mutation events
function findRewardContainer (mutations) {
    mutations.forEach(function(mutation) {
        if (!mutation.addedNodes) return
        mutation.addedNodes.forEach(function(node) {
            if (node.className.includes('simplebar-scroll-content')) {
                const wrap = node.getElementsByClassName('simplebar-content')[0]
                const view = wrap.getElementsByClassName('reward-queue-view')[0]
                if (!view) return // No reward view here
                const body = view.getElementsByClassName('reward-queue-body')[0].childNodes[0]
                var rewardContainer = body.getElementsByClassName('simplebar-scroll-content')[0]
                        .firstChild
                        .firstChild
                        .firstChild
                if (rewardContainer.className.includes('reward-queue-body-container')) {
                    console.log("ctPoints: Rewards container found!", rewardContainer)
                    ctPointsContainerObserver.disconnect()
                    console.log("ctPoints: Listening for reward events")
                    ctPointsRewardObserver.observe(rewardContainer, {
                        childList: true,
                        subtree: true,
                        attributes: false,
                        chatacterData: false
                    })
                }
            }
        })
    })
}

// find DOM events we're interested in
function filterDOMInsertionEvents (mutations) {
    mutations.forEach(function(mutation) {
        if (!mutation.addedNodes) return
        mutation.addedNodes.forEach(function(node) {
            const $redemptionContainer = $(node).find('.redemption-card__card-body')
            // check if we found a redemption card
            if ($redemptionContainer.length > 0) {
                // we have a redemtpion so now handle it
                handleRedemption($redemptionContainer)
            }
        })
    })
}

// used handle the redemption event, accepts jquery object
async function handleRedemption ($redemptionContainer) {
    const redemptionData = extractAllData($redemptionContainer)
    console.log(redemptionData)
    try {
        const result = await rewards[redemptionData.rewardName](redemptionData)
        if (result) {
            redemptionData.actions.resolve.click()
        } else {
            redemptionData.actions.reject.click()
        }
    } catch (e) {
        // don't do anything with failed redemptions (we might not know about them)
        console.error(e.message)
    }
}

// pull everything off the DOM and return an object
function extractAllData ($redemptionContainer) {
    const userName = extractUsername($redemptionContainer)
    const rewardName = extractRewardName($redemptionContainer)
    const response = extractResponse($redemptionContainer)
    const reportId = extractId($redemptionContainer)
    const actions = extractActionButtons($redemptionContainer)

    return {
        userName,
        rewardName,
        response,
        reportId,
        actions
    }
}

function extractUsername ($redemptionContainer) {
    // start by finding the chat badges, as they are a good anchor for username
    const $chatBadges = $redemptionContainer.find('img.chat-badge')
    const userName = $chatBadges.siblings('h4').html()
    return userName
}

function extractRewardName ($redemptionContainer) {
    // start with the text "REWARD" and find its h4 sibling
    const $rewardTitleSibling = $redemptionContainer.find('h5:contains(REWARD)')
    const rewardName = $rewardTitleSibling.siblings('h4').html()
    return rewardName
}

function extractResponse ($redemptionContainer) {
    // start with the text "RESPONSE" and find its h4 sibling
    const $responseTitleSibling = $redemptionContainer.find(
        'h5:contains(RESPONSE)'
    )
    const response = $responseTitleSibling.siblings('h4').html()
    return response
}

function extractId ($redemptionContainer) {
    // drill down through report-button element for the id stored on the tooltip div
    const id = $redemptionContainer
        .find('.redemption-card__report-button')
        .find('.mod-buttons')
        .siblings('.tw-tooltip')
        .attr('id')
    return id
}

function extractActionButtons ($redemptionContainer) {
    // look for button elements in the container (should only be two)
    const $buttons = $redemptionContainer.find('button')

    // return the DOM elements themselves not jquery
    return {
        resolve: $buttons[0],
        reject: $buttons[1]
    }
}
