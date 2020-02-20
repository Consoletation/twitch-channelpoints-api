// Application
const ctPointsContainerObserver = new MutationObserver(findRewardContainer)
const ctPointsRewardObserver = new MutationObserver(filterDOMInsertionEvents)
const handledRewards = []
const cooldowns = []
let settings = {}
let redemptions = {}

// runs when the DOM is ready
$().ready(async () => {
    settings = await loadSettings()
    redemptions = await loadRedemptions()
    await connectToOBS(settings.obs)
    browser.runtime.onMessage.addListener(messageListener)

    log('Channel Points Handler Loaded.')
    // get the reward container
    ctPointsContainerObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
    })
})

function messageListener(message, sender, sendResponse) {
    console.log('got message:', message, sender, sendResponse)
    if (message.event === 'settings') {
        loadSettings()
    } else if (message.event === 'redemptions') {
        loadRedemptions()
    }

    sendResponse('OK')
}

async function loadSettings() {
    return Promise.resolve({
        obs: {
            address: 'localhost:1234',
            password: 'noom1234',
        },
    })
}

async function loadRedemptions() {
    return Promise.resolve({
        'Event: Take On Me': {
            startScene: 'Game Capture', // if start scene is specified then the alert only plays when OBS is on that scene
            cooldownInSeconds: 600,
            hold: false, // do we return to the start scene?
            commands: [
                {
                    function: 'SetCurrentScene',
                    config: { 'scene-name': 'Game Capture (takeonme)' },
                },
                {
                    function: 'Wait',
                    config: { timeInMs: 1300 },
                },
            ],
        },
    })
}

async function connectToOBS(obs) {
    log('OBS integration enabled. Attempting connection...')
    obs.client = new OBSWebSocket()
    return obs.client
        .connect(settings.obs)
        .then(() => {
            log('OBS client connected!')
        })
        .catch(err => {
            log('OBS client failed to connect!', err)
        })
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
    if (handledRewards.includes(redemptionData.reportId)) {
        log('Reward', redemptionData.reportId, 'already handled, skipping')
        return
    } else {
        log('DEBUG redemptionData', redemptionData)
        handledRewards.push(redemptionData.reportId)
    }
    try {
        // check if its on cooldown
        if (cooldowns.indexOf(redemptionData.rewardName) >= 0) {
            redemptionData.actions.reject.click()
            throw new Error(
                `Reward, ${redemptionData.rewardName} is on cooldown, rejecting`
            )
        } else {
            // immediately add to cooldown
            addToCooldown(redemptionData)
        }

        try {
            // execute the reward function
            await executeCommandChain(redemptionData)
            log(`accepting: ${redemptionData.rewardName}`)
            redemptionData.actions.resolve.click()
        } catch (e) {
            log('rejecting: ' + e.message)
            // need to remove it from the cooldowns because it didn't actually run
            removeFromCooldown(redemptionData)
            redemptionData.actions.reject.click()
        }
    } catch (e) {
        // unexpected reward failure!
        console.error(e.message)
        // need to remove it from the cooldowns because it didn't actually run
        removeFromCooldown(redemptionData)
        redemptionData.actions.reject.click()
    }
}

async function executeCommandChain(redemptionData) {
    const redemption = redemptions[redemptionData.rewardName]
    const initialScene = await settings.obs.client.send('GetCurrentScene')
    // check if the redemption exists
    if (!redemption) {
        throw new Error(
            `Received unhandled reward: ${redemptionData.rewardName}, ignoring`
        )
    }

    // does the user require a specific scene to be active to start
    if (redemption.startScene && initialScene.name !== redemption.startScene) {
        throw new Error(
            `Not on correct start scene, requires '${redemption.startScene}' but have '${initialScene.name}'`
        )
    }

    // execute all of the commands in series
    for (
        let index = 0, len = redemption.commands.length;
        index < len;
        index++
    ) {
        const command = redemption.commands[index]
        await commands[command.function](command.config)
    }

    // do we return to the initial scene?
    if (!redemption.hold) {
        await settings.obs.client.send('SetCurrentScene', {
            'scene-name': initialScene.name,
        })
    }

    console.log('finished execution chain')

    return true
}

const commands = {
    SetCurrentScene: config => {
        return settings.obs.client.send('SetCurrentScene', config)
    },
    Wait: config => {
        return delay(config.timeInMs)
    },
}

function addToCooldown(redemptionData) {
    const reward = redemptions[redemptionData.rewardName]
    const name = redemptionData.rewardName
    const cooldown = reward.cooldownInSeconds
    cooldowns.push(name)
    setTimeout(() => {
        removeFromCooldown(redemptionData)
    }, cooldown * 1000)
    log('Added ', name + ' to cooldowns')
}

function removeFromCooldown(redemptionData) {
    const name = redemptionData.rewardName
    const index = cooldowns.indexOf(name)
    if (index >= 0) {
        cooldowns.splice(index, 1)
        log('Removed ', name + ' from cooldowns')
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

function log() {
    const prefix = '[ctPoints]'
    const args = Array.prototype.slice.call(arguments)
    args.unshift('%c' + prefix, 'background: #222; color: #bada55')
    console.log.apply(console, args)
}

function delay(t, v) {
    return new Promise(function(resolve) {
        setTimeout(resolve.bind(null, v), t)
    })
}

Promise.prototype.delay = function(t) {
    return this.then(function(v) {
        return delay(t, v)
    })
}
