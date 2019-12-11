const rewards = {
    'Waste 1000 points': function(redemption) {
        console.log(
            `DEBUG Congrats ${redemption.user} for wasting 1000 points!`
        )
        return Promise.resolve('Wasted 1000 points')
    },
    'Donate AUD': function(redemption) {
        console.log(
            `DEBUG We don't accept dollarydoos here, ${redemption.user}...`
        )
        return Promise.reject('no AUD')
    },
}

// runs when the DOM is ready
$().ready(() => {
    console.log('Channel Points Handler Loaded')
    // get the reward container
    const $rewardContainer = $(document)
        .find('.reward-queue-body')
        .find('.simplebar-scroll-content')

    $rewardContainer.bind('DOMNodeInserted', event =>
        filterDOMInsertionEvents(event)
    )
})

// find DOM events we're interested in
function filterDOMInsertionEvents(event) {
    // console.log('got insertion event', event)
    $redemptionContainer = $(event.target).find('.redemption-card__card-body')
    // check if we found a redemption card
    if ($redemptionContainer.length > 0) {
        console.log('got redemption: ', $redemptionContainer)
        // we have a redemtpion so now handle it
        handleRedemption($redemptionContainer)
    }
}

// used handle the redemption event, accepts jquery object
function handleRedemption($redemptionContainer) {
    const redemptionData = extractAllData($redemptionContainer)
}

function extractAllData($redemptionContainer) {
    const userName = extractUsername($redemptionContainer)
    const rewardName = extractRewardName($redemptionContainer)
    const reportId = extractId($redemptionContainer)
    const $actionButtons = extractActionButtons($redemptionContainer)

    console.log('extraction data: ', userName, rewardName, reportId, $actionButtons)

    debugger
    $completeButton = $($actionButtons[0])
    $completeButton.click()
}

function extractUsername($redemptionContainer) {
    // start by finding the chat badges, as they are a good anchor for username
    const $chatBadges = $redemptionContainer.find('img.chat-badge')
    const userName = $chatBadges.siblings('h4').html()
    return userName
}

function extractRewardName($redemptionContainer) {
    const $rewardTitleSibling = $redemptionContainer.find('h5:contains(REWARD)')
    const rewardName = $rewardTitleSibling.siblings('h4').html()
    return rewardName
}

function extractId($redemptionContainer) {
    const id = $redemptionContainer
        .find('.redemption-card__report-button')
        .find('.mod-buttons')
        .siblings('.tw-tooltip')
        .attr('id')
    return id
}

function extractActionButtons($redemptionContainer) {
    const $buttons = $redemptionContainer.find('button')
    return $buttons
}
