var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');


let config;
let accounts;


contract('Flight Surety Tests', async (acc) => {
    accounts = acc;
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

it('flightSuretyApp is authorised to make calls to flightSuretyData', async function () {
    const status = await config.flightSuretyData.getCallerAuthorizationStatus(config.flightSuretyApp.address);
    assert.equal(status, true, "flightSuretyApp is not authorized");
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
