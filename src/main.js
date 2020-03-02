import { listen } from './dom-listener'
import { setupDOM, displayError } from './dom-manipulator'
import { connect } from './event-handler'
import { log } from './helpers'

$().ready(async () => {
    // start listening on the DOM
    await listen()
    console.log('Twitch DOM fully loaded')
    setupDOM()

    // load settings and connect to OBS
    try {
        await connect()
        log('Connected to OBS!')
    } catch (obsError) {
        const error = new Error(
            `There was a problem connecting to OBS: ${obsError.code} ${obsError.description}`
        )
        displayError(error)
    }
})
