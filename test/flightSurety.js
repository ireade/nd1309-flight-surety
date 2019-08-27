var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

let config;
let accounts;

let firstAirline;
let secondAirline;
let thirdAirline;
let fourthAirline;
let fifthAirline;

contract('Flight Surety Tests', async (acc) => {
    accounts = acc;

    firstAirline = accounts[0];
    secondAirline = accounts[1];
    thirdAirline = accounts[2];
    fourthAirline = accounts[3];
    fifthAirline = accounts[4];
});

before(async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.setCallerAuthorizationStatus(config.flightSuretyApp.address, true);

    // @todo: Make sure first airline pays dues
});


/****************************************************************************************/
/* Operations and Settings                                                              */
/****************************************************************************************/

it(`(multiparty) has correct initial isOperational() value`, async function () {
    assert.equal(await config.flightSuretyData.isOperational(), true, "Incorrect initial operating status value for flightSuretyData");
    assert.equal(await config.flightSuretyApp.isOperational(), true, "Incorrect initial operating status value for flightSuretyApp");
});

// @todo: Tests for setting operational status?

it('flightSuretyApp is authorised to make calls to flightSuretyData', async function () {
    const status = await config.flightSuretyData.getCallerAuthorizationStatus(config.flightSuretyApp.address);
    assert.equal(status, true, "flightSuretyApp is not authorized");
});


/****************************************************************************************/
/* Airlines                                                                             */
/****************************************************************************************/

it('Airlines can apply for registration', async function () {
    await config.flightSuretyApp.applyForAirlineRegistration("Second Airline", { from: secondAirline });
    await config.flightSuretyApp.applyForAirlineRegistration("Third Airline", { from: thirdAirline });
    await config.flightSuretyApp.applyForAirlineRegistration("Fourth Airline", { from: fourthAirline });
    await config.flightSuretyApp.applyForAirlineRegistration("Fifth Airline", { from: fifthAirline });

    await config.flightSuretyApp.applyForAirlineRegistration("Fifth Airline", { from: accounts[5] });

    assert.equal(await config.flightSuretyApp.getAirlineState(secondAirline), 0, "2nd applied airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(thirdAirline), 0, "3rd applied airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(fourthAirline), 0, "4th applied airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(fifthAirline), 0, "5th applied airline is of incorrect state");
});

it('Paid airline can approve up to 4 applied airlines', async function () {
    await config.flightSuretyApp.approveAirlineRegistration(secondAirline, { from: firstAirline });
    await config.flightSuretyApp.approveAirlineRegistration(thirdAirline, { from: firstAirline });
    await config.flightSuretyApp.approveAirlineRegistration(fourthAirline, { from: firstAirline });

    const approvedState = 2;

    assert.equal(await config.flightSuretyApp.getAirlineState(secondAirline), approvedState, "2nd registered airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(thirdAirline), approvedState, "3rd registered airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(fourthAirline), approvedState, "4th registered airline is of incorrect state");
});

it('Paid airline cannot approve a fifth airline alone', async function () {
    try {
        await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: firstAirline });
    } catch (err) {}

    // @todo: come back to this after payment
    //assert.equal(await config.flightSuretyApp.getAirlineState(fifthAirline), 0, "Airline is of incorrect state");
});


//
// it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
//
//     // ARRANGE
//     let newAirline = accounts[2];
//
//     // ACT
//     try {
//         await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
//     } catch (e) {
//
//     }
//     let result = await config.flightSuretyData.isAirline.call(newAirline);
//
//     // ASSERT
//     assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
//
// });
