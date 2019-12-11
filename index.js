// Configurable
const rewards = {
    'Example Response': async function (redemption) {
        // An example reward that will log the response
        log(`sending message: ${redemption.response} from ${redemption.userName}!`)
    },
    'Example Success': async function (redemption) {
        // An example reward that will always succeed
        log(`Congrats ${redemption.userName}!`)
    },
    'Example Fail': async function (redemption) {
        // An example reward that will always fail
        log(`this was made to fail, ${redemption.userName}...`)
        throw Error('Purposefully failing reward')
    }
}

// Application
const ctPointsContainerObserver = new MutationObserver(findRewardContainer)
const ctPointsRewardObserver = new MutationObserver(filterDOMInsertionEvents)

// runs when the DOM is ready
$().ready(() => {
    log('Channel Points Handler Loaded. Looking for rewards...')
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
                const queue = $(node).find('.reward-queue-body')[0]
                if (!queue) return // No reward queue here
                log("Rewards container found! Listening for reward events...")
                ctPointsContainerObserver.disconnect()
                ctPointsRewardObserver.observe(queue, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    chatacterData: false
                })
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
    const redemptionData = await extractAllData($redemptionContainer)
    log("DEBUG redemptionData", redemptionData)
    try {
        rewards[redemptionData.rewardName](redemptionData).then(
            () => {
                redemptionData.actions.resolve.click()
            }
        ).catch(
            err => {
                redemptionData.actions.reject.click()
            }
        )
    } catch (e) {
        // don't do anything with unhandled redemptions
        console.error(e.message)
    }
}

// pull everything off the DOM and return an object
async function extractAllData ($redemptionContainer) {
    let userName = extractUsername($redemptionContainer)
    if (!userName) userName = await extractUsernameAsync($redemptionContainer)
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
    // start with the text "USER" and find its div sibling with an h4 descendant
    const $rewardUserSibling = $redemptionContainer.find('h5:contains(USER)')
    const userName = $rewardUserSibling.siblings('div').find('h4').html()
    return userName
}

function extractUsernameAsync ($redemptionContainer) {
    let promiseResolve, promiseReject
    const promise = new Promise(function(resolve, reject) {
        promiseResolve = resolve
        promiseReject = reject
    })
    const userObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (!mutation.addedNodes) return
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'H4') {
                    // We got a username
                    userObserver.disconnect()
                    promiseResolve(node.textContent) // return username
                }
            })
        })
    })
    // start with the text "USER" and find its div sibling
    const $rewardUserSibling = $redemptionContainer.find('h5:contains(USER)')
    const userDiv = $rewardUserSibling.siblings('div')[0]
    // Observe the div until we find an h4 element containing the username
    userObserver.observe(userDiv, {
                        childList: true,
                        subtree: false,
                        attributes: false,
                        chatacterData: false
    })
    setTimeout(() => { promiseReject("Could not get username"); }, 3000);
    return promise
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

function log () {
    const prefix = "[ctPoints]"
    const args = Array.prototype.slice.call(arguments);
    args.unshift('%c' + prefix, 'background: #222; color: #bada55');
    console.log.apply(console, args);
}
