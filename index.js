const jsonTrial = [
    {
        'Event: Take On Me': {
            startScene: 'Game Capture', // if start scene is specified then the alert only plays when OBS is on that scene
            cooldownInSeconds: 600,
            hold: false, // do we return to the start scene?
            commands: [
                {
                    function: 'setCurrentScene',
                    config: { 'scene-name': 'Game Capture (takeonme)' }
                },
                {
                    function: 'wait',
                    config: { timeInMs: 13000 }
                }
            ]
        }
    }
]

// Configurable
const rewards = {
    'Event: Take On Me': {
        suffix: ' (takeonme)',
        cooldownInSeconds: 600,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                await delay(13000)
                // back to original scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })

                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    },
    'Event: Shutup Noom': {
        suffix: ' (slap)',
        cooldownInSeconds: 300,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                await delay(2500)
                // back to original scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })

                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    },
    'Event: Confetti': {
        suffix: ' (confetti)',
        cooldownInSeconds: 300,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                await delay(5000)
                // back to original scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })

                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    },
    'Event: Retro': {
        suffix: ' (retro)',
        cooldownInSeconds: 600,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                await delay(12000)
                // back to original scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })

                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    },
    'Event: Disco Dancin': {
        suffix: ' (disco)',
        cooldownInSeconds: 900,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                // set the source visible (disco ball enters)
                await obs.client.send('SetSceneItemProperties', {
                    item: 'disco_enter',
                    visible: true
                })

                await delay(920)

                // swap to looping disco ball
                await obs.client.send('SetSceneItemProperties', {
                    item: 'disco',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'disco_enter',
                    visible: false
                })

                await delay(20000)
                // reset them back to not visible
                await obs.client.send('SetSceneItemProperties', {
                    item: 'disco_enter',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'disco',
                    visible: false
                })

                // back to original scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })

                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    },
    'Event: DJ Pressplay': {
        suffix: ' (rave)',
        cooldownInSeconds: 1800,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                // wait for first drop
                await delay(13000)

                // set the sources visible (webcam, crowd, lasers)
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'dance_crowd',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'lasers',
                    visible: true
                })

                await delay(19000)

                // set all the first sources not visible
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'dance_crowd',
                    visible: false
                })

                // set second set of sources visible
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM 2',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'dance_crowd_2',
                    visible: true
                })

                await delay(10000)
                // reset all visibility
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM 2',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'dance_crowd_2',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'lasers',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM',
                    visible: true
                })

                // back to original scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })

                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    },
    'Event: Thanos Snap': {
        suffix: ' (snap)',
        cooldownInSeconds: 600,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                await obs.client.send('SetSceneItemProperties', {
                    item: 'snapaudio',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'snapdust',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'thanossnap',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'SNAP_FADE_FINAL',
                    visible: false
                })

                // let the audio play a bit then play snap clip
                await delay(5000)
                await obs.client.send('SetSceneItemProperties', {
                    item: 'thanossnap',
                    visible: true
                })

                await delay(4000)
                await obs.client.send('SetSceneItemProperties', {
                    item: 'SNAP_FADE_FINAL',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'snapdust',
                    visible: true
                })

                await delay(5000)
                await obs.client.send('SetSceneItemProperties', {
                    item: 'SNAP_FADE_FINAL',
                    visible: false
                })

                await delay(15000)
                // back to original scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })

                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    },
    'Event: Plant a Bomb': {
        suffix: ' (explode)',
        cooldownInSeconds: 600,
        execute: async function (redemption) {
            try {
                const initialScene = await obs.client.send('GetCurrentScene')
                // change to the scene
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name + this.suffix
                })

                // set up the scene items
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM',
                    visible: true
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'smokebomb',
                    visible: false
                })
                await obs.client.send('SetSceneItemProperties', {
                    item: 'explosion',
                    visible: false
                })

                // show explosion and hide cam
                await delay(2500)
                await obs.client.send('SetSceneItemProperties', {
                    item: 'explosion',
                    visible: true
                })
                await delay(500)
                await obs.client.send('SetSceneItemProperties', {
                    item: 'smokebomb',
                    visible: true
                })
                await delay(800)
                // hide cam
                await obs.client.send('SetSceneItemProperties', {
                    item: 'WEBCAM',
                    visible: false
                })

                // back to original scene
                await delay(15000)
                await obs.client.send('SetCurrentScene', {
                    'scene-name': initialScene.name
                })
                return {
                    success: true,
                    message: 'We did the OBS thing!'
                }
            } catch (e) {
                return {
                    success: false,
                    message: e.error
                }
            }
        }
    }
}
const obs = {
    enabled: true,
    address: 'localhost:1234',
    password: 'noom1234'
}

// Application
const ctPointsContainerObserver = new MutationObserver(findRewardContainer)
const ctPointsRewardObserver = new MutationObserver(filterDOMInsertionEvents)
const handledRewards = []
const cooldowns = []

// OBS Integration
if (obs.enabled) {
    log('OBS integration enabled. Attempting connection...')
    obs.client = new OBSWebSocket()
    obs.client
        .connect({ address: obs.address, password: obs.password })
        .then(out => {
            log('OBS client connected!', out)
        })
        .catch(err => {
            log('OBS client failed to connect!', err)
        })
}

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
    mutations.forEach(function (mutation) {
        if (!mutation.addedNodes) return
        mutation.addedNodes.forEach(function (node) {
            if (node.className.includes('simplebar-scroll-content')) {
                const queue = $(node).find('.reward-queue-body')[0]
                if (!queue) return // No reward queue here
                log('Rewards container found! Listening for reward events...')
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
    mutations.forEach(function (mutation) {
        if (!mutation.addedNodes) return
        mutation.addedNodes.forEach(function (node) {
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
async function handleRedemption ($redemptionContainer) {
    const redemptionData = await extractAllData($redemptionContainer)
    if (handledRewards.includes(redemptionData.reportId)) {
        log('Reward', redemptionData.reportId, 'already handled, skipping')
        return
    } else {
        log('DEBUG redemptionData', redemptionData)
        handledRewards.push(redemptionData.reportId)
    }
    const rewardFunction = rewards[redemptionData.rewardName]
    if (rewardFunction) {
        try {
            // check if its on cooldown
            if (cooldowns.indexOf(redemptionData.rewardName) >= 0) {
                log(
                    'Reward',
                    redemptionData.rewardName,
                    'is on cooldown, rejecting'
                )
                redemptionData.actions.reject.click()
                return
            } else {
                // immediately add to cooldown
                addToCooldown(redemptionData)
            }

            // execute the reward function
            const result = await rewards[redemptionData.rewardName].execute(
                redemptionData
            )
            if (result.success) {
                log('accepting: ' + result.message)
                redemptionData.actions.resolve.click()
            } else {
                log('rejecting: ' + result.message)
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
    } else {
        // don't do anything with unhandled redemptions
        log(
            'Received unhandled reward:',
            redemptionData.rewardName + ', ignoring'
        )
    }
}

function addToCooldown (redemptionData) {
    const reward = rewards[redemptionData.rewardName]
    const name = redemptionData.rewardName
    const cooldown = reward.cooldownInSeconds
    cooldowns.push(name)
    setTimeout(() => {
        removeFromCooldown(redemptionData)
    }, cooldown * 1000)
    log('Added ', name + ' to cooldowns')
}

function removeFromCooldown (redemptionData) {
    const name = redemptionData.rewardName
    const index = cooldowns.indexOf(name)
    if (index >= 0) {
        cooldowns.splice(index, 1)
        log('Removed ', name + ' from cooldowns')
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
    const userName = $rewardUserSibling
        .siblings('div')
        .find('h4')
        .html()
    return userName
}

function extractUsernameAsync ($redemptionContainer) {
    let promiseResolve, promiseReject
    const promise = new Promise(function (resolve, reject) {
        promiseResolve = resolve
        promiseReject = reject
    })
    const userObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (!mutation.addedNodes) return
            mutation.addedNodes.forEach(function (node) {
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
    setTimeout(() => {
        promiseReject('Could not get username')
    }, 3000)
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
    const prefix = '[ctPoints]'
    const args = Array.prototype.slice.call(arguments)
    args.unshift('%c' + prefix, 'background: #222; color: #bada55')
    console.log.apply(console, args)
}

function delay (t, v) {
    return new Promise(function (resolve) {
        setTimeout(resolve.bind(null, v), t)
    })
}

Promise.prototype.delay = function (t) {
    return this.then(function (v) {
        return delay(t, v)
    })
}
