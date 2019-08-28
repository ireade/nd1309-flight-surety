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
    }

    initialize(callback) {
        let self = this;
        this.web3.eth.getAccounts((error, accounts) => {
           
            self.owner = accounts[0];


            // Authorize contract

            self.flightSuretyData.methods
                .setCallerAuthorizationStatus(self.config.appAddress, true)
                .call({ from: self.owner }, (err, res) => {

                    console.log(res);


                    self.flightSuretyData.methods
                        .getCallerAuthorizationStatus(self.config.appAddress)
                        .call({ from: self.owner }, (err, status) => {

                            console.log(status)

                            // @todo: change back
                            callback(true);
                        }); // end getCallerAuthorizationStatus()

                }); // end setCallerAuthorizationStatus()
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

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .fetchFlightStatus(airline, flight, timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, result);
            });
    }
}
