import { log } from './helpers'
import { Command, COMMAND_PRESETS } from './classes/Command'
import { saveRedemptionEvent, getRedemption } from './event-handler'
// templates
import ErrorContainer from './views/errors.hbs'
import AppContainer from './views/app.hbs'
import RedemptionEvent from './views/redemption.hbs'
import CreateForm from './views/create-form.hbs'
import CommandForm from './views/command-form.hbs'
import CommandFormValue from './views/command-form-value.hbs'

log('Channel Points DOM Manipulator Loaded.')

// initialize the DOM with our UI components
export function setupDOM() {
    console.log('setting up the DOM')
    $('.app-container').remove()
    $('.reward-queue-body').prepend(AppContainer())
    $('.create-form-container .main-options').prepend(CreateForm())
    $('.create-form-container .command-group').append(createNewCommandForm())

    bindClicks()
}

function bindClicks() {
    $('#create-event-button').click(showCreateView)
    $('#create-form-submit-button').click(createNewRedemptionEvent)
    $('#create-form-create-command').click(() => {
        $('.create-form-container .command-group').append(
            createNewCommandForm()
        )
    })
    $('#edit-form-create-command').click(() => {
        $('.edit-form-container .command-group').append(
            createNewCommandForm()
        )
    })
    $('#edit-form-submit-button').click(() => {
        editRedemptionEvent()
    })
}

function showCreateView() {
    alert('making new alert now')
}

async function createNewRedemptionEvent() {
    const $form = $('.create-form-container')
    const redemptionEvent = parseJqueryFormToObject($form)

    // send off the redemptionEvent for storage
    try {
        await saveRedemptionEvent(redemptionEvent)
    } catch (e) {
        // saving failed, do we need to confirm?
        if (confirm(e.message)) {
            await saveRedemptionEvent(redemptionEvent, true)
        }
    }
}

async function editRedemptionEvent() {
    const $formContainer = $('.edit-form-container')
    const redemptionEvent = parseJqueryFormToObject($formContainer)

    // send off the redemptionEvent for storage
    await saveRedemptionEvent(redemptionEvent, true)
}

function parseJqueryFormToObject($formContainer) {
    const redemptionEvent = {}
    // grab the values out of the form
    const optionsSerialData = $formContainer.find('.form').serializeArray()
    optionsSerialData.forEach(element => {
        redemptionEvent[element.name] = element.value
    })

    // grab all of the commands and boil them down into Command objects
    const commandsSerialData = []
    $formContainer.find('.command-form').each(function() {
        commandsSerialData.push($(this).serializeArray())
    })
    redemptionEvent.commands = []
    commandsSerialData.forEach(element => {
        const functionName = element.shift().value
        const config = element.map(el => {
            return {
                value: el.value ?? false,
                name: el.name,
            }
        })
        const commandData = {
            functionName,
            config,
        }
        let command = new Command(commandData)
        redemptionEvent.commands.push(command)
    })
    return redemptionEvent
}

function createNewCommandForm(defaults) {
    const presets = COMMAND_PRESETS
    const $commandForm = $(CommandForm())
    const $functionSelect = $commandForm.find('#function-select')
    $functionSelect.change(function() {
        const functionName = $(this).val()
        const preset = COMMAND_PRESETS[functionName]
        const actions = preset.actions
        $commandForm.find('.action-value-group').empty()
        actions.forEach(action => {
            const template = CommandFormValue({
                name: action.name,
                type: action.type,
                value: action.value,
                property: action.property,
            })
            $commandForm.find('.action-value-group').append(template)
        })
    })
    return $commandForm
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
            let $redemption = $(redemptionTemplate)
            bindRedemptionButtons(redemptionName, $redemption)
            redemptionTemplates.push($redemption)
        }
    }
    $('.redemptions-container')
        .empty()
        .append(redemptionTemplates)
}

function bindRedemptionButtons(redemptionName, $redemption) {
    $redemption.find('#redemption-edit-button').click(function() {
        loadEditView(redemptionName)
    })

    $redemption.find('#redemption-delete-button').click(function() {
        deleteRedemption(redemptionName)
    })
}

async function loadEditView(redemptionName) {
    const redemption = await getRedemption(redemptionName)
    const $editForm = $('.edit-form-container')
    $editForm
        .find('.main-options')
        .empty()
        .html(CreateForm(redemption))
        $editForm.find('')
    $editForm.find('.command-options .command-group').empty()
    redemption.commands.forEach(command => {
        const $commandForm = createNewCommandForm()
        $editForm.find('.command-options .command-group').append($commandForm)
        $commandForm
            .find('#function-select')
            .val(command.functionName)
            .change(function() {
                for (const key in command.config) {
                    const $input = $commandForm.find(`input[name=${key}]`)
                    $input.val(command.config[key])
                    if($input.attr('type')==='checkbox'){
                        $input.prop('checked', command.config[key])
                    }
                }
            })
            .change()
    })
}

function deleteRedemption(redemptionName) {
    alert('really?')
}

export function displayError(error) {
    const errorContainer = ErrorContainer({ message: error.message })
    // check if we have a container on the DOM
    $('.error-container').remove()
    $('.errors').prepend(errorContainer)
}
