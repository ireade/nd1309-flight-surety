import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        this.config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.config.url));

        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);

        this.initialize(callback);

        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        let self = this;
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            self.flightSuretyData.methods
                .setCallerAuthorizationStatus(self.config.appAddress, true)
                .call({ from: self.owner }, callback);
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    getFlights(callback) {
        let self = this;

        self.flightSuretyApp.methods
            .getFlightsCount()
            .call({ from: self.owner }, async (err, flightsCount) => {
                const flights = [];
                for (var i = 0; i < flightsCount; i++) {
                    const res = await self.flightSuretyApp.methods.getFlight(i).call({ from: self.owner });
                    flights.push(res);
                }
                callback(null, flights);
            });
    }

    purchaseInsurance(airline, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .purchaseInsurance(airline, flight, timestamp)
            .send(
                {from: self.owner, value: this.web3.utils.toWei('1', 'ether')},
                callback
            )
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        } 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}
