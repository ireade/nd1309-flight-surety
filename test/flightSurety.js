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

    const appliedState = 0;

    assert.equal(await config.flightSuretyApp.getAirlineState(secondAirline), appliedState, "2nd applied airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(thirdAirline), appliedState, "3rd applied airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(fourthAirline), appliedState, "4th applied airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(fifthAirline), appliedState, "5th applied airline is of incorrect state");
});

it('Paid airline can approve up to 4 applied airlines', async function () {
    await config.flightSuretyApp.approveAirlineRegistration(secondAirline, { from: firstAirline });
    await config.flightSuretyApp.approveAirlineRegistration(thirdAirline, { from: firstAirline });
    await config.flightSuretyApp.approveAirlineRegistration(fourthAirline, { from: firstAirline });

    const registeredState = 1;

    assert.equal(await config.flightSuretyApp.getAirlineState(secondAirline), registeredState, "2nd registered airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(thirdAirline), registeredState, "3rd registered airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(fourthAirline), registeredState, "4th registered airline is of incorrect state");
});

it('Registered airlines can pay dues', async function () {
    await config.flightSuretyApp.payAirlineDues({ from: secondAirline, value: web3.utils.toWei('10', 'ether') });
    await config.flightSuretyApp.payAirlineDues({ from: thirdAirline, value: web3.utils.toWei('10', 'ether') });
    await config.flightSuretyApp.payAirlineDues({ from: fourthAirline, value: web3.utils.toWei('10', 'ether') });

    const paidState = 2;

    assert.equal(await config.flightSuretyApp.getAirlineState(secondAirline), paidState, "2nd paid airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(thirdAirline), paidState, "3rd paid airline is of incorrect state");
    assert.equal(await config.flightSuretyApp.getAirlineState(fourthAirline), paidState, "4th paid airline is of incorrect state");
});

it('Multiparty consensus required to approve fifth airline', async function () {
    // Note: Based on 4 paid airlines

    // First approval should fail
    try {
        await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: firstAirline });
    } catch (err) {}
    assert.equal(await config.flightSuretyApp.getAirlineState(fifthAirline), 0, "Single airline should not be able to approve a fifth airline alone");

    // Second approval should pass
    await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: secondAirline });
    assert.equal(await config.flightSuretyApp.getAirlineState(fifthAirline), 1, "5th registered airline is of incorrect state");
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
