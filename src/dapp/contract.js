import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {

    constructor(network, callback) {

        this.config = Config[network];
        console.log(this.config);

        this.owner = null;
        this.passenger = null;

        this.setWeb3Provider()
            .then(() => this.web3 = new Web3(this.web3Provider))
            .then(() => {
                this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
                this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
                return this.web3.eth.getAccounts((err, accounts) => this.owner = accounts[0]);
            })
            .then(() => this.authorizeAppContract(callback))
            .catch(() => callback(false));
    }

    async setWeb3Provider() {

        if (window.ethereum) {
            this.web3Provider = window.ethereum;
            try {
                await window.ethereum.enable();
                console.log("Connected to web3 via window.ethereum");
            } catch (error) {
                console.error("User denied account access");
            }
        } else if (window.web3) {
            this.web3Provider = window.web3.currentProvider;
            console.log("Connected to web3 via window.web3.currentProvider");
        } else {
            this.web3Provider = new Web3.providers.HttpProvider(this.config.url);
            console.warn(`No web3 detected. Falling back to ${this.config.url}`);
        }

        return this.web3Provider;
    }

    authorizeAppContract(callback) {
        this.flightSuretyData.methods
            .getCallerAuthorizationStatus(this.config.appAddress)
            .call({ from: this.owner }, (err, isAuthorized) => {

                if (isAuthorized) return callback(isAuthorized);

                this.flightSuretyData.methods
                    .setCallerAuthorizationStatus(this.config.appAddress, true)
                    .send({ from: this.owner }, () => {
                        callback(true);
                    });

            });
    }


    /* */


    isOperational() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .isOperational()
                .call({ from: this.owner}, (err, res) => {
                    if (err) reject(err);
                    resolve(res);
                });
        });
    }

    getFlights() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .getFlightsCount()
                .call({ from: this.owner }, async (err, flightsCount) => {
                    const flights = [];
                    for (var i = 0; i < flightsCount; i++) {
                        const res = await this.flightSuretyApp.methods.getFlight(i).call({ from: this.owner });
                        flights.push(res);
                    }
                    resolve(flights);
                });
        });
    }

    purchaseInsurance(airline, flight, timestamp, amount, callback) {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .purchaseInsurance(airline, flight, timestamp)
                .send(
                    {from: this.owner, value: this.web3.utils.toWei(amount.toString(), 'ether')},
                    (err, res) => {
                        if (err) reject(err);
                        resolve(res);
                    }
                )
        });
    }

    getPassengerInsurances(flights) {
        const insurances = [];

        return Promise
            .all(flights.map(async (flight) => {
                const insurance = await this.flightSuretyApp.methods
                    .getInsurance(flight.flight)
                    .call({ from: this.owner });

                if (insurance.amount !== "0") insurances.push({
                    amount: this.web3.utils.fromWei(insurance.amount, 'ether'),
                    payoutAmount: this.web3.utils.fromWei(insurance.payoutAmount, 'ether'),
                    state: insurance.state,
                    flight: flight
                });
            }))
            .then(() => insurances)
    }

    fetchFlightStatus(airline, flight, timestamp) {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .fetchFlightStatus(airline, flight, timestamp)
                .send(
                    { from: this.owner },
                    (err, res) => {
                        if (err) reject(err);
                        resolve(res);
                    }
                );
        });
    }

    claimInsurance(airline, flight, timestamp) {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .claimInsurance(airline, flight, timestamp)
                .send(
                    { from: this.owner },
                    (err, res) => {
                        if (err) reject(err);
                        resolve(res);
                    }
                );
        });
    }

    getBalance() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .getBalance()
                .call({ from: this.owner }, async (err, balance) => {
                    resolve(this.web3.utils.fromWei(balance, 'ether'));
                });
        });
    }

    withdrawBalance() {
        return new Promise((resolve, reject) => {
            this.flightSuretyApp.methods
                .withdrawBalance()
                .send(
                    { from: this.owner },
                    (err, res) => {
                        if (err) reject(err);
                        resolve(res);
                    }
                 );
        });
    }
}
