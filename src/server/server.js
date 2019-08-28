import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import express from 'express';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

init();
const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const oracles = [];

async function init() {
    const accounts = await web3.eth.getAccounts();

    const NUMBER_OF_ORACLES = 10;
    registerOracles(accounts.slice(1, NUMBER_OF_ORACLES + 1));

    flightSuretyApp.events.OracleRequest({fromBlock: 0}, (error, event) => {
        if (error) return console.log(error);
        if (!event.returnValues) return console.error("No returnValues");

        respondToFetchFlightStatus(
            event.returnValues.index,
            event.returnValues.airline,
            event.returnValues.flight,
            event.returnValues.timestamp
        )
    });

    simulateFetchFlightStatus(accounts[0]);
}

async function simulateFetchFlightStatus(owner) {
    console.log("Simulating fetchFlightStatus");

    const airline = owner;
    const flight = 'ND1309';
    const timestamp = Math.floor(Date.now() / 1000);

    flightSuretyApp.methods
        .fetchFlightStatus(airline, flight, timestamp)
        .call({ from: owner });
}

async function registerOracles(oracleAccounts) {

    const fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
    const STATUS_CODES = [0, 10, 20, 30, 40, 50];

    for (let i = 0; i < oracleAccounts.length; i++) {

        const address = oracleAccounts[i];
        const statusCode = STATUS_CODES[Math.floor(Math.random() * STATUS_CODES.length)];

        await flightSuretyApp.methods.registerOracle().send({
            from: address,
            value: fee,
            gas: 3000000
        });

        const indexes = await flightSuretyApp.methods.getMyIndexes().call({
            from: address,
        });

        oracles.push({ address, indexes, statusCode });
    }

    console.log(oracles);
}

async function respondToFetchFlightStatus(index, airline, flight, timestamp) {

    const relevantOracles = [];

    oracles.forEach((oracle) => {
        if ( BigNumber(oracle.indexes[0]).isEqualTo(index) ) relevantOracles.push( oracle );
        if ( BigNumber(oracle.indexes[1]).isEqualTo(index) ) relevantOracles.push( oracle );
        if ( BigNumber(oracle.indexes[2]).isEqualTo(index) ) relevantOracles.push( oracle );
    });

    relevantOracles.forEach(async (oracle) => {
        await flightSuretyApp.methods.submitOracleResponse(
            index,
            airline,
            flight,
            timestamp,
            oracle.statusCode
        ).call({
            from: oracle.address
        });
    });
}

const app = express();
app.get('/api', (req, res) => {
    res.send({
        message: 'An API for use with your Dapp!'
    })
});

export default app;


