import { log } from './helpers'
import { setupDOM } from './dom-manipulator'
import { executeRedemption } from './event-handler'

// Application
const ctPointsContainerObserver = new MutationObserver(findRewardContainer)
const ctPointsRewardObserver = new MutationObserver(filterDOMInsertionEvents)
const handledRewards = new Map()
const pendingRewards = new Map()
let resolver = {}
const DOMReady = new Promise(resolve => {
    resolver = resolve
})

export function listen() {
    log('Channel Points DOM Listener Loaded.')
    // get the reward container
    ctPointsContainerObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
    })
    return DOMReady
}

// find reward container from mutation events
function findRewardContainer(mutations) {
    mutations.forEach(function(mutation) {
        if (!mutation.addedNodes) return
        mutation.addedNodes.forEach(function(node) {
            if (node.className.includes('simplebar-scroll-content')) {
                const queue = $(node).find('.reward-queue-body')[0]
                if (!queue) return // No reward queue here
                log('Rewards container found! Listening for reward events...')
                ctPointsContainerObserver.disconnect()
                ctPointsRewardObserver.observe(queue, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    chatacterData: false,
                })
                // resolves the deferred promise
                resolver()
            }
        })
    })
}

// find DOM events we're interested in
function filterDOMInsertionEvents(mutations) {
    mutations.forEach(function(mutation) {
        if (!mutation.addedNodes) return
        mutation.addedNodes.forEach(function(node) {
            const $redemptionContainer = $(node).find(
                '.redemption-card__card-body'
            )
            // check if we found a redemption card
            if ($redemptionContainer.length > 0) {
                // we have a redemtpion so now handle it
                handleRedemption($redemptionContainer)
            }
        })
    })
}

// used handle the redemption event, accepts jquery object
async function handleRedemption($redemptionContainer) {
    const redemptionData = await extractAllData($redemptionContainer)
    if (handledRewards.has(redemptionData.reportId)) {
        log('Reward', redemptionData.reportId, 'already handled, skipping')
        return
    } else {
        log('Handling redemption', redemptionData)
        handledRewards.set(redemptionData.reportId)
        pendingRewards.set(redemptionData.reportId, redemptionData)
        const result = await executeRedemption(redemptionData)
        console.log(result)
    }
}

// pull everything off the DOM and return an object
async function extractAllData($redemptionContainer) {
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
        actions,
    }
}

function extractUsername($redemptionContainer) {
    // start with the text "USER" and find its div sibling with an h4 descendant
    const $rewardUserSibling = $redemptionContainer.find('h5:contains(USER)')
    const userName = $rewardUserSibling
        .siblings('div')
        .find('h4')
        .html()
    return userName
}

function extractUsernameAsync($redemptionContainer) {
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
        chatacterData: false,
    })
    setTimeout(() => {
        promiseReject('Could not get username')
    }, 3000)
    return promise
}

function extractRewardName($redemptionContainer) {
    // start with the text "REWARD" and find its h4 sibling
    const $rewardTitleSibling = $redemptionContainer.find('h5:contains(REWARD)')
    const rewardName = $rewardTitleSibling.siblings('h4').html()
    return rewardName
}

function extractResponse($redemptionContainer) {
    // start with the text "RESPONSE" and find its h4 sibling
    const $responseTitleSibling = $redemptionContainer.find(
        'h5:contains(RESPONSE)'
    )
    const response = $responseTitleSibling.siblings('h4').html()
    return response
}

function extractId($redemptionContainer) {
    // drill down through report-button element for the id stored on the tooltip div
    const id = $redemptionContainer
        .find('.redemption-card__report-button')
        .find('.mod-buttons')
        .siblings('.tw-tooltip')
        .attr('id')
    return id
}

function extractActionButtons($redemptionContainer) {
    // look for button elements in the container (should only be two)
    const $buttons = $redemptionContainer.find('button')

    // return the DOM elements themselves not jquery
    return {
        resolve: $buttons[0],
        reject: $buttons[1],
    }
}
