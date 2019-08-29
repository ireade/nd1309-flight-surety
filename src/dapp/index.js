import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


class App {

    constructor() {

        this.flights = [];
        this.balance = 0;

        this.contract = new Contract('localhost', (authorized) => {

            if (!authorized) return display(
                'App contract authorization',
                'Checks if app contract is authorized to make calls to data contract',
                [ { label: 'Status', value: authorized} ]
            );

            this.contract.isOperational()
                .then((result) => {
                    display(
                        'Operational Status',
                        'Checks if contract is operational',
                        [ { label: 'Status', value: result} ]
                    );
                })
                .catch((err) => {
                    display(
                        'Operational Status',
                        'Checks if contract is operational',
                        [ { label: 'Status', error: err} ]
                    );
                });

            this.listenForFlightStatusUpdate();
            this.getFlights();
            this.getBalance();
        });
    }

    async getFlights() {
        this.flights = await this.contract.getFlights() || [];

        console.log(this.flights);

        const purchaseInsuranceSelect = DOM.elid('purchase-insurance-flights');

        this.flights.forEach((flight) => {
            const option = document.createElement('option');
            option.value = `${flight.airline}-${flight.flight}-${flight.timestamp}`;
            const prettyDate = new Date(flight.timestamp * 1000).toDateString();
            option.textContent = `${flight.flight} on ${prettyDate}`;
            purchaseInsuranceSelect.appendChild(option);
        });

        this.getPassengerInsurances();
        this.getBalance();
    }

    async getPassengerInsurances() {
        this.insurances = await this.contract.getPassengerInsurances(this.flights) || [];

        const insuredFlightsList = DOM.elid("insured-flights");
        let html = '';
        if (this.insurances.length === 0) html = `<p>Purchase insurance above.</p>`;

        this.insurances.forEach((insurance, index) => {
            const prettyDate = new Date(insurance.flight.timestamp * 1000).toDateString();

            let button = `<button data-action="1" data-insurance-index="${index}">Check Status</button>`;
            if (insurance.state === "1") button = `<button disabled>Claim Insurance</button>`;
            else if (insurance.flight.statusCode === "20") button = `<button data-action="2" data-insurance-index="${index}">Claim Insurance</button>`;

            html += `
            <li data-insurance-index="${index}">
                <div>
                    <p><strong>${insurance.flight.flight} on ${prettyDate}</strong></p>
                    <p>${insurance.amount} ETH insurance bought / ${insurance.payoutAmount} ETH payout</p>
                    <p>${insurance.flight.statusCode} code</p>
                </div>
                <div>
                    ${button}
                    
                </div>
            </li>
            `;
        });

        insuredFlightsList.innerHTML = html;
    }

    async getBalance() {
        this.contract.getBalance().then((balance) => {
            this.balance = balance;
            document.getElementById('passenger-balance').textContent = `${balance} ETH`;
        });
    }

    async fetchFlightStatus(airline, flight, timestamp) {
        this.contract.fetchFlightStatus(airline, flight, timestamp)
            .then(() => {
                display(
                    'Oracles',
                    'Fetching flight status from oracles',
                    [
                        { label: 'Flight', value: flight}
                     ]
                );
            })
            .catch((error) => console.log("Error fetching flight status"));
    }

    async listenForFlightStatusUpdate() {
        this.contract.flightSuretyApp.events.FlightStatusInfo({fromBlock: 0}, (error, event) => {
            if (error) return console.log(error);
            if (!event.returnValues) return console.error("No returnValues");

            if (this.flights.length === 0) return;

            this.getFlights();
        });
    }

    async purchaseInsurance(flight, amount) {
        this.contract.purchaseInsurance(flight[0], flight[1], flight[2], amount)
            .then(() =>  this.getFlights())
            .catch((error) => console.log("Error purchasing insurance"));
    }

    async claimInsurance(airline, flight, timestamp) {
        this.contract.claimInsurance(airline, flight, timestamp)
            .then((res) => {
                this.getFlights();
            })
            .catch((error) => console.log("Error claiming insurance"));
    }

    async requestPayout() {
        this.contract.withdrawBalance()
            .then(() => this.getBalance())
            .catch((error) => console.log("Error withdrawing balance"))
    }

}

const Application = new App();

/* Event Listeners *************************** */

document.addEventListener('click', (ev) => {
    if (!ev.target.dataset.action) return;

    const action = parseFloat(ev.target.dataset.action);

    let insuranceIndex;
    let insurance;

    switch(action) {
        case 0:
            const flight = DOM.elid('purchase-insurance-flights').value.split("-");
            const amount = DOM.elid('purchase-insurance-amount').value;
            Application.purchaseInsurance(flight, amount);
            break;
        case 1:
            insuranceIndex = ev.target.dataset.insuranceIndex;
            insurance = Application.insurances[insuranceIndex];
            Application.fetchFlightStatus(insurance.flight.airline, insurance.flight.flight, insurance.flight.timestamp);
            break;
        case 2:
            insuranceIndex = ev.target.dataset.insuranceIndex;
            insurance = Application.insurances[insuranceIndex];
            Application.claimInsurance(insurance.flight.airline, insurance.flight.flight, insurance.flight.timestamp);
            break;
        case 3:
            Application.requestPayout();
            break;
    }
});

/* Utility Functions *************************** */

function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");

    let section = DOM.div();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.p({className: 'description'}, description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'field'}, result.label + ': '));
        row.appendChild(DOM.div({className: 'field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    });
    displayDiv.append(section);

}
