const Test = require('../config/testConfig.js');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js');

let config;
let accounts;

let firstAirline;
let secondAirline;
let thirdAirline;
let fourthAirline;
let fifthAirline;

let passenger;

contract('Flight Surety Tests', async (acc) => {
    accounts = acc;

    firstAirline = accounts[0];
    secondAirline = accounts[1];
    thirdAirline = accounts[2];
    fourthAirline = accounts[3];
    fifthAirline = accounts[4];

    passenger = accounts[5];
});

before(async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.setCallerAuthorizationStatus(config.flightSuretyApp.address, true);
});


/****************************************************************************************/
/* Operations and Settings                                                              */
/****************************************************************************************/

it(`(multiparty) has correct initial isOperational() value`, async function () {
    assert.equal(await config.flightSuretyData.isOperational(), true, "Incorrect initial operating status value for flightSuretyData");
    assert.equal(await config.flightSuretyApp.isOperational(), true, "Incorrect initial operating status value for flightSuretyApp");
});

it('flightSuretyApp is authorised to make calls to flightSuretyData', async function () {
    const status = await config.flightSuretyData.getCallerAuthorizationStatus(config.flightSuretyApp.address);
    assert.equal(status, true, "flightSuretyApp is not authorized");
});


/****************************************************************************************/
/* Airlines                                                                             */
/****************************************************************************************/

it('Contract owner is created as first airline', async function () {
    assert.equal(await config.flightSuretyData.getAirlineState(firstAirline), 2, "First airline");
});

it('Airlines can apply for registration', async function () {
    const applyForAirlineRegistration = await config.flightSuretyApp.applyForAirlineRegistration("Second Airline", { from: secondAirline });
    await config.flightSuretyApp.applyForAirlineRegistration("Third Airline", { from: thirdAirline });
    await config.flightSuretyApp.applyForAirlineRegistration("Fourth Airline", { from: fourthAirline });
    await config.flightSuretyApp.applyForAirlineRegistration("Fifth Airline", { from: fifthAirline });

    await config.flightSuretyApp.applyForAirlineRegistration("Fifth Airline", { from: accounts[5] });

    const appliedState = 0;

    assert.equal(await config.flightSuretyData.getAirlineState(secondAirline), appliedState, "2nd applied airline is of incorrect state");
    assert.equal(await config.flightSuretyData.getAirlineState(thirdAirline), appliedState, "3rd applied airline is of incorrect state");
    assert.equal(await config.flightSuretyData.getAirlineState(fourthAirline), appliedState, "4th applied airline is of incorrect state");
    assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), appliedState, "5th applied airline is of incorrect state");

    truffleAssert.eventEmitted(applyForAirlineRegistration, 'AirlineApplied', (ev) => {
        return ev.airline === secondAirline;
    });
});

it('Paid airline can approve up to 4 applied airlines', async function () {
    const approveAirlineRegistration = await config.flightSuretyApp.approveAirlineRegistration(secondAirline, { from: firstAirline });
    await config.flightSuretyApp.approveAirlineRegistration(thirdAirline, { from: firstAirline });
    await config.flightSuretyApp.approveAirlineRegistration(fourthAirline, { from: firstAirline });

    const registeredState = 1;

    assert.equal(await config.flightSuretyData.getAirlineState(secondAirline), registeredState, "2nd registered airline is of incorrect state");
    assert.equal(await config.flightSuretyData.getAirlineState(thirdAirline), registeredState, "3rd registered airline is of incorrect state");
    assert.equal(await config.flightSuretyData.getAirlineState(fourthAirline), registeredState, "4th registered airline is of incorrect state");

    truffleAssert.eventEmitted(approveAirlineRegistration, 'AirlineRegistered', (ev) => {
        return ev.airline === secondAirline;
    });
});

it('Registered airlines can pay dues', async function () {
    const payAirlineDues = await config.flightSuretyApp.payAirlineDues({ from: secondAirline, value: web3.utils.toWei('10', 'ether') });
    await config.flightSuretyApp.payAirlineDues({ from: thirdAirline, value: web3.utils.toWei('10', 'ether') });
    await config.flightSuretyApp.payAirlineDues({ from: fourthAirline, value: web3.utils.toWei('10', 'ether') });

    const paidState = 2;

    assert.equal(await config.flightSuretyData.getAirlineState(secondAirline), paidState, "2nd paid airline is of incorrect state");
    assert.equal(await config.flightSuretyData.getAirlineState(thirdAirline), paidState, "3rd paid airline is of incorrect state");
    assert.equal(await config.flightSuretyData.getAirlineState(fourthAirline), paidState, "4th paid airline is of incorrect state");

    truffleAssert.eventEmitted(payAirlineDues, 'AirlinePaid', (ev) => {
        return ev.airline === secondAirline;
    });

    const balance = await web3.eth.getBalance(config.flightSuretyData.address);
    const balanceEther = web3.utils.fromWei(balance, 'ether');

    assert.equal(balanceEther, 30, "Balance wasn't transferred");
});

it('Multiparty consensus required to approve fifth airline', async function () {
    // Note: Based on 4 paid airlines

    // First approval should fail
    try {
        await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: firstAirline });
    } catch (err) {}
    assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), 0, "Single airline should not be able to approve a fifth airline alone");

    // Second approval should pass
    const approveAirlineRegistration = await config.flightSuretyApp.approveAirlineRegistration(fifthAirline, { from: secondAirline });
    assert.equal(await config.flightSuretyData.getAirlineState(fifthAirline), 1, "5th registered airline is of incorrect state");

    truffleAssert.eventEmitted(approveAirlineRegistration, 'AirlineRegistered', (ev) => {
        return ev.airline === fifthAirline;
    });
});


/****************************************************************************************/
/* Flights                                                                              */
/****************************************************************************************/



/****************************************************************************************/
/* Passenger Insurance                                                                  */
/****************************************************************************************/

it('Passenger can buy insurance for flight', async function () {

    const flight1 = await config.flightSuretyApp.getFlight(0);
    const amount = await config.flightSuretyApp.MAX_INSURANCE_AMOUNT.call();

    const INSURANCE_DIVIDER = await config.flightSuretyApp.INSURANCE_DIVIDER.call();
    const expectedPayoutAmount = parseFloat(amount) + (parseFloat(amount)  / parseFloat(INSURANCE_DIVIDER) );

    await config.flightSuretyApp.purchaseInsurance(
        flight1.airline,
        flight1.flight,
        flight1.timestamp,
        { from: passenger, value: amount }
    );

    const insurance = await config.flightSuretyApp.getInsurance(flight1.flight, { from: passenger });

    assert.equal(parseFloat(insurance.payoutAmount), expectedPayoutAmount, "Insurance payout amount is incorrect");
});


it('Passenger cannot buy more than 1 ether of insurance', async function () {

    const flight1 = await config.flightSuretyApp.getFlight(0);
    let amount = await config.flightSuretyApp.MAX_INSURANCE_AMOUNT.call();
    amount = amount + amount;

    let failed = false;

    try {
        await config.flightSuretyApp.purchaseInsurance(
            flight1.airline,
            flight1.flight,
            flight1.timestamp,
            { from: passenger, value: amount }
        );
    } catch(err) {
        failed = true;
    }

    assert.equal(failed, true, "Passenger was able to purchase insurance of more than 1 ether");
});

it('Passenger can check status of flight', async function () {

    const flight1 = await config.flightSuretyApp.getFlight(0);

    const fetchFlightStatus = await config.flightSuretyApp.fetchFlightStatus(
        flight1.airline,
        flight1.flight,
        flight1.timestamp,
    );

    truffleAssert.eventEmitted(fetchFlightStatus, 'OracleRequest', (ev) => {
        return ev.airline === flight1.airline;
    });
});


