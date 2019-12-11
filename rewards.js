export default REWARDS = {
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