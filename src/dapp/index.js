import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


class App {

    constructor() {

        this.flights = [];

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


            // @todo: events

            this.getFlights();
        });
    }


    async getFlights() {
        this.flights = await this.contract.getFlights() || [];

        const purchaseInsuranceSelect = DOM.elid('purchase-insurance-flights');

        this.flights.forEach((flight) => {
            const option = document.createElement('option');
            option.value = `${flight.airline}-${flight.flight}-${flight.timestamp}`;
            const prettyDate = new Date(flight.timestamp * 1000).toDateString();
            option.textContent = `${flight.flight} on ${prettyDate}`;
            purchaseInsuranceSelect.appendChild(option);
        });

        this.getPassengerInsurances();
    }


    async getPassengerInsurances() {
        const insurances = await this.contract.getPassengerInsurances(this.flights) || [];

        console.log(insurances);

        const checkStatusSelect = DOM.elid('check-status-flights');
        checkStatusSelect.innerHTML = "";

        insurances.forEach((insurance) => {
            const option = document.createElement('option');
            option.value = `${insurance.airline}-${insurance.flight}-${insurance.timestamp}`;
            option.textContent = `${insurance.flight} - ${insurance.amount} ETH`;
            checkStatusSelect.appendChild(option);
        });
    }

    async purchaseInsurance(flight, amount) {
        this.contract.purchaseInsurance(flight[0], flight[1], flight[2], amount)
            .then((result) => {
                console.log(result);
                this.getPassengerInsurances();
            })
            .catch((error) => {
                console.log(error, result);
            });
    }

    async fetchFlightStatus(flight) {

        // display(
        //     'Oracles',
        //     'Trigger oracles',
        //     [ { label: 'Fetch Flight Status', error: error, value: flight[1]} ]
        // );

        this.contract.fetchFlightStatus(flight[0], flight[1], flight[2])
            .then((result) => {
                console.log(result);

            })
            .catch((error) => {
                console.log(error, result);
            });
    }

}

const Application = new App();

/* Event Listeners *************************** */

DOM.elid('purchase-insurance').addEventListener('click', () => {
    let flight = DOM.elid('purchase-insurance-flights').value;
    flight = flight.split("-");
    const amount = DOM.elid('purchase-insurance-amount').value;

    Application.purchaseInsurance(flight, amount);
});

DOM.elid('submit-oracle').addEventListener('click', () => {
    let flight = DOM.elid('check-status-flights').value;
    flight = flight.split("-");

    Application.fetchFlightStatus(flight);
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
