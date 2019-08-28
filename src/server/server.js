import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import express from 'express';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const oracles = [];

async function init() {
    const accounts = await web3.eth.getAccounts();

    flightSuretyApp.events.OracleRequest({fromBlock: 0}, (error, event) => {
        if (error) console.log(error);
        console.log(event);
    });

    simulateFetchFlightStatus(accounts[0]);

    const oracleAccounts = [ accounts[1], accounts[2] ];
    //registerOracles(oracleAccounts);
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

    //const RESPONSES = [0, 10, 20, 30, 40, 50]; @todo: change
    const RESPONSES = [0, 20];

    for (let i = 0; i < oracleAccounts.length; i++) {

        const address = oracleAccounts[i];
        const response = RESPONSES[Math.floor(Math.random()*RESPONSES.length)];

        await flightSuretyApp.methods.registerOracle().send({
            from: address,
            value: fee,
            gas: 3000000
        });

        const indexes = await flightSuretyApp.methods.getMyIndexes().call({
            from: address
        });

        oracles.push({ address, indexes, response });
    }

    console.log(oracles);
}

async function sendOracleResponse() {

}


init();



// API


const app = express();
app.get('/api', (req, res) => {
    res.send({
        message: 'An API for use with your Dapp!'
    })
});

export default app;


