const Test = require('../config/testConfig.js');
const truffleAssert = require('truffle-assertions');
const BigNumber = require('bignumber.js');

let config;
let accounts;

const TEST_ORACLES_COUNT = 10;

// Watch contract events
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;


contract('Oracles', async (acc) => {
    accounts = acc;

    config = await Test.Config(accounts);

});

before(async () => {
    config = await Test.Config(accounts);
});


it('can register oracles', async () => {

    const fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
        await config.flightSuretyApp.registerOracle({from: accounts[a], value: fee});

        let result = await config.flightSuretyApp.getMyIndexes({from: accounts[a]});

        console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
});

it('can request flight status', async () => {

    const airline = config.firstAirline;
    const flight = 'ND1309';
    const timestamp = Math.floor(Date.now() / 1000);

    const oracleRequest = await config.flightSuretyApp.fetchFlightStatus(airline, flight, timestamp);

    let emittedIndex;

    truffleAssert.eventEmitted(oracleRequest, 'OracleRequest', (ev) => {
        emittedIndex = ev.index;
        return ev.flight === flight;
    });

    console.log(`Index: ${emittedIndex}`);


    // Find matching oracles

    const relevantOracles = [];
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
        const oracleIndexes = await config.flightSuretyApp.getMyIndexes({from: accounts[a]});
        if ( BigNumber(oracleIndexes[0]).isEqualTo(emittedIndex) ) relevantOracles.push( accounts[a] );
        if ( BigNumber(oracleIndexes[1]).isEqualTo(emittedIndex) ) relevantOracles.push( accounts[a] );
        if ( BigNumber(oracleIndexes[2]).isEqualTo(emittedIndex) ) relevantOracles.push( accounts[a] );
    }

    console.log(relevantOracles);

    // Have matching oracles return response


    relevantOracles.forEach(async (account) => {
        const statusCode = STATUS_CODE_ON_TIME; //@todo: randomise

        await config.flightSuretyApp.submitOracleResponse(
            emittedIndex,
            airline,
            flight,
            timestamp,
            statusCode,
            {from: account}
        );
    });

    // Find event?

    // truffleAssert.eventEmitted(submitOracleResponse, 'OracleReport', (ev) => {
    //     console.log(ev.statusCode);
    //     return ev.statusCode === statusCode;
    // });


    // Wait for event


});
