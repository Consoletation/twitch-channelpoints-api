'use strict'

const rewards = {
    'Waste 1000 points': function (redemption) {
        console.log(
            `DEBUG Congrats ${redemption.user} for wasting 1000 points!`
        )
        return Promise.resolve('Wasted 1000 points')
    },
    'Donate AUD': function (redemption) {
        console.log(
            `DEBUG We don't accept dollarydoos here, ${redemption.user}...`
        )
        return Promise.reject('no AUD')
    }
}

function getRewardNode () {
    let promiseResolve, promiseReject
    const promise = new Promise(function (resolve, reject) {
        promiseResolve = resolve
        promiseReject = reject
    })
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (!mutation.addedNodes) return

            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i]
                if (node.className.includes('simplebar-scroll-content')) {
                    const wrap = node.getElementsByClassName(
                        'simplebar-content'
                    )[0]
                    const view = wrap.getElementsByClassName(
                        'reward-queue-view'
                    )[0]
                    if (!view) {
                        // No reward queue view here
                        continue
                    }
                    const body = view.getElementsByClassName(
                        'reward-queue-body'
                    )[0].childNodes[0]
                    const rewardContainer = body.getElementsByClassName(
                        'simplebar-scroll-content'
                    )[0].firstChild.firstChild.firstChild
                    observer.disconnect()
                    promiseResolve(rewardContainer)
                }
            }
        })
    })
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    })
    return promise
}

function redemptionHandler (redemption) {
    let promiseResolve, promiseReject
    const promise = new Promise(function (resolve, reject) {
        promiseResolve = resolve
        promiseReject = reject
    })
    let output
    const redemptionMethod = rewards[redemption.reward]
    if (redemptionMethod) {
        // Attempt reward
        redemptionMethod(redemption)
            .then(data => {
                // Success
                redemption.action.complete.click()
                promiseResolve(data)
            })
            .catch(err => {
                // Failure
                redemption.action.reject.click()
                promiseReject(err)
            })
    } else {
        // We don't handle this, do nothing to it, and reject promise
        promiseReject('unhandled')
    }

    return promise
}

getRewardNode().then(function (node) {
    console.log('DEBUG Consoletation channel points API handler v2 activated!')
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (!mutation.addedNodes) return

            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i]
                if (node.className.includes('tw-transition')) {
                    const pointsRedemption = node.getElementsByClassName(
                        'redemption-card__card-body'
                    )[0]
                    if (pointsRedemption && pointsRedemption.hasChildNodes) {
                        // Components
                        const pointsComponents = pointsRedemption.childNodes
                        const pointsReport = pointsComponents[0].childNodes
                        const pointsInfo = pointsComponents[1].childNodes
                        const pointsResolve = pointsComponents[2].childNodes

                        // Report
                        const reportId = pointsReport[0].firstChild.lastChild.id

                        // Info
                        const infoReward = pointsInfo[0].lastChild.textContent
                        // NOTE: This method will skip existing rewards, due to load.
                        const infoUser = pointsInfo[1].lastChild.getElementsByTagName(
                            'H4'
                        )[0].textContent
                        // Response if exists
                        var infoResponse
                        if (pointsInfo[2]) {
                            infoResponse = pointsInfo[2].getElementsByTagName(
                                'H4'
                            )[0].textContent
                        }

                        // Action
                        const actionComplete = pointsResolve[0].firstChild
                        const actionReject = pointsResolve[1].firstChild

                        const redemption = {
                            id: reportId,
                            user: infoUser,
                            reward: infoReward,
                            response: infoResponse,
                            action: {
                                complete: actionComplete,
                                reject: actionReject
                            }
                        }
                        console.log('DEBUG Redemption:', redemption)
                        redemptionHandler(redemption)
                            .then(out => {
                                console.log('DEBUG success', out)
                            })
                            .catch(err => {
                                console.log('DEBUG failure', err)
                            })
                    }
                }
            }
        })
    })
    observer.observe(node, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
    })
})
