import { log } from './helpers'
import { Command } from './classes/Command'
import ErrorContainer from './views/errors.hbs'
import AppContainer from './views/app.hbs'
import RedemptionEvent from './views/redemption.hbs'
import CreateForm from './views/create-form.hbs'
import CommandForm from './views/command-form.hbs'

log('Channel Points DOM Manipulator Loaded.')

// initialize the DOM with our UI components
export function setupDOM() {
    console.log('setting up the DOM')
    $('.app-container').remove()
    $('.reward-queue-body').prepend(AppContainer())
    $('.create-form-container .main-options').prepend(CreateForm())
    $('.create-form-container .command-options').append(CommandForm())
    bindClicks()
}

function bindClicks() {
    $('#create-event-button').click(showCreateView)
    $('#create-form-submit-button').click(createNewRedemptionEvent)
}

function showCreateView() {
    alert('making new alert now')
}

function createNewRedemptionEvent() {
    let redemptionEvent = {}
    // grab the values out of the form
    const optionsSerialData = $('.create-form').serializeArray()
    optionsSerialData.forEach(element => {
        redemptionEvent[element.name] = element.value
    })

    // grab all of the commands and boil them down into Command objects
    const commandsSerialData = []
    $('.command-form').each(function() {
        commandsSerialData.push($(this).serializeArray())
    })
    redemptionEvent.commands = []
    commandsSerialData.forEach(element => {
        const commandData = {
            function: element[0].value,
            configValue: element[1].value,
        }
        let command = new Command(commandData)
        redemptionEvent.commands.push(command)
    })

    // send off the redemptionEvent for storage
    console.log(redemptionEvent)
}

export function displayRedemptions(redemptions) {
    console.log('displaying redemptions')
    const redemptionTemplates = []
    for (const redemptionName in redemptions) {
        if (redemptions.hasOwnProperty(redemptionName)) {
            const redemption = redemptions[redemptionName]
            const redemptionTemplate = RedemptionEvent({
                redemptionName,
                redemption,
            })
            redemptionTemplates.push(redemptionTemplate)
        }
    }
    $('.redemptions-container')
        .empty()
        .append(redemptionTemplates)
}

export function displayError(error) {
    const errorContainer = ErrorContainer({ message: error.message })
    // check if we have a container on the DOM
    $('.error-container').remove()
    $('.errors').prepend(errorContainer)
}
