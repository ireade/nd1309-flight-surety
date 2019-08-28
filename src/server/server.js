import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import express from 'express';
import Web3 from 'web3';

const config = Config['localhost'];
const web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));

const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);


const oracles = [];


async function registerOracles() {

    const accounts = await web3.eth.getAccounts();

    const oracleAddress = accounts[9];
    const fee = web3.utils.toWei('1', 'ether');


    // Register Oracle

    try {
        await flightSuretyApp.methods.registerOracle().send({
            from: oracleAddress,
            value: fee,
            gas: 3000000
        });
    } catch (err) {
        console.log("Error registerOracle");
        console.log(err);
    }


    // Get Oracle Indexes

    try {

        const indexes = await flightSuretyApp.methods.getMyIndexes().call({
            from: oracleAddress
        });

        oracles.push({
            address: oracleAddress,
            indexes: indexes
        });

    } catch (err) {
        console.log("Error getMyIndexes");
        console.log(err);
    }


    ////

    console.log(oracles);


    // Simulate fetchFlightStatus


    setTimeout(async () => {
        console.log("fetchFlightStatus **********************************");

        flightSuretyApp.methods
            .fetchFlightStatus(accounts[0], "IRE123", Math.floor(Date.now() / 1000))
            .call();

    }, 1000);

};


flightSuretyApp.events.OracleRequest({
    fromBlock: 0
})
.on('data', function(event){
    console.log(event);
})
.on('changed', function(event){
})
.on('error', console.error);



registerOracles();



// API


const app = express();
app.get('/api', (req, res) => {
    res.send({
        message: 'An API for use with your Dapp!'
    })
});

export default app;


