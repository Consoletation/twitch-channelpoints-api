// Application
const cooldowns = []
let settings = {}
let redemptions = {}

// runs when the DOM is ready
$().ready(async () => {
    settings = await loadSettings()
    redemptions = await loadRedemptions()
    await connectToOBS(settings.obs)
    browser.runtime.onMessage.addListener(messageListener)

    log('Channel Points Event Handler Loaded.')
})

function messageListener(message, sender, sendResponse) {
    console.log('got message:', message, sender, sendResponse)
    if (message.event === 'loadSettings') {
        loadSettings()
    } else if (message.event === 'loadRedemptions') {
        loadRedemptions()
    } else if (message.event === 'redemption') {
        console.log('new redemption event')
        handleRedemption(message.data)
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

// used handle the redemption event, accepts jquery object
async function handleRedemption(redemptionData) {
    debugger
    try {
        // check if its on cooldown
        if (cooldowns.indexOf(redemptionData.rewardName) >= 0) {
            rejectRedemption(redemptionData)
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
            acceptRedemption(redemptionData)
        } catch (e) {
            log('rejecting: ' + e.message)
            // need to remove it from the cooldowns because it didn't actually run
            removeFromCooldown(redemptionData)
            rejectRedemption(redemptionData)
        }
    } catch (e) {
        // unexpected reward failure!
        console.error(e.message)
        // need to remove it from the cooldowns because it didn't actually run
        removeFromCooldown(redemptionData)
        rejectRedemption(redemptionData)
    }
}

function rejectRedemption(redemptionData) {
    log(`rejecting: ${redemptionData.rewardName}`)
    return browser.runtime.sendMessage({
        event: 'rejectRedemption',
        data: redemptionData,
    })
}

function acceptRedemption(redemptionData) {
    log(`accepting: ${redemptionData.rewardName}`)
    return browser.runtime.sendMessage({
        event: 'acceptRedemption',
        data: redemptionData,
    })
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
