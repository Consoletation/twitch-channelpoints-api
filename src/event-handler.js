import { displayRedemptions, displaySettings, displayError } from './dom-manipulator'

// Application
const cooldowns = []
let settings = {}
let redemptionEvents = {}
const storage = window.localStorage
const REDEMPTIONS_KEY = 'redemptionEvents'
const SETTINGS_KEY = 'redemptionSettings'
const STORAGE_KEY = 'settings'

const DEFAULT_SETTINGS = {
    address: 'localhost:4444',
    password: ''
}
const demoEvent = {
    redemptionName: 'Event: Take On Me',
    startScene: 'Game Capture', // if start scene is specified then the alert only plays when OBS is on that scene
    cooldownInSeconds: 600,
    hold: false, // do we return to the start scene?
    commands: [
        {
            functionName: 'SetCurrentScene',
            prettyName: 'Change to scene',
            config: {
                'scene-name': 'Game Capture (takeonme)',
            },
        },
        {
            functionName: 'Wait',
            prettyName: 'Pause',
            config: { timeInMs: 1300 },
        },
    ],
}

const commands = {
    SetCurrentScene: config => {
        return settings.obs.client.send('SetCurrentScene', config)
    },
    Wait: config => {
        return delay(config.timeInMs)
    },
    SetSourceVisibility: config => {
        return settings.obs.client.send('SetSceneItemProperties', {visible: config.visibility})
    }
}

export async function connect() {
    log('Channel Points Event Handler Loaded.')

    settings.obs = await loadSettings()
    redemptionEvents = await loadRedemptionEvents()
    displayRedemptions(redemptionEvents)
    return connectToOBS(settings.obs)
}

export async function loadSettings() {
    const storedSettings = JSON.parse(storage.getItem(SETTINGS_KEY)) ?? DEFAULT_SETTINGS
    console.log(`Loaded settings: `, storedSettings)
    displaySettings(storedSettings)
    return Promise.resolve(storedSettings)
}

export async function saveSettings(newSettings) {
    disconnectFromOBS(settings.obs)
    settings.obs = {...newSettings}
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings.obs))
    try {
        await connectToOBS(settings.obs)
        log('Connected to OBS!')
    } catch (obsError) {
        const error = new Error(
            `There was a problem connecting to OBS: ${obsError.code} ${obsError.description}`
        )
        displayError(error)
    }
}

export async function saveRedemptionEvent(redemption, override) {
    // not overriding existing settings so check if it exists
    if(!override){
        if(redemptionEvents[redemption.redemptionName]){
            return Promise.reject(new Error('Entry already exists, are you sure you want to replace it?'))
        }
    }

    redemptionEvents[redemption.redemptionName] = redemption
    storage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptionEvents))
    displayRedemptions(redemptionEvents)
    return Promise.resolve(true)
}

export async function loadRedemptionEvents() {
    const storedItems = JSON.parse(storage.getItem(REDEMPTIONS_KEY)) ?? {}
    storedItems[demoEvent.redemptionName] = demoEvent
    console.log(`Loaded redemptions: `, storedItems)
    return Promise.resolve(storedItems)
}

export async function getRedemption(redemptionName) {
    return Promise.resolve(redemptionEvents[redemptionName])
}

async function connectToOBS(obs) {
    log('OBS integration enabled. Attempting connection...')
    obs.client = new OBSWebSocket()
    return obs.client.connect(settings.obs)
}

async function disconnectFromOBS(obs){
    obs.client.disconnect()
}

// used handle the redemption event, accepts jquery object
export async function executeRedemption(redemptionData) {
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
    // click the reject button
}

function acceptRedemption(redemptionData) {
    log(`accepting: ${redemptionData.rewardName}`)
    // click the accept button
}

async function executeCommandChain(redemptionData) {
    const redemption = redemptionEvents[redemptionData.rewardName]
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
        await commands[command.functionName](command.config)
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

function addToCooldown(redemptionData) {
    const reward = redemptionEvents[redemptionData.rewardName]
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
