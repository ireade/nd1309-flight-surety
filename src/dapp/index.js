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
        this.insurances = await this.contract.getPassengerInsurances(this.flights) || [];

        const insuredFlightsList = DOM.elid("insured-flights");
        let html = '';
        if (this.insurances.length === 0) html = `<p>Purchase insurance above.</p>`;

        this.insurances.forEach((insurance, index) => {
            const prettyDate = new Date(insurance.timestamp * 1000).toDateString();

            html += `
            <li>
                <div>
                    <p><strong>${insurance.flight} on ${prettyDate}</strong></p>
                    <p>${insurance.amount} ETH insurance bought</p>
                </div>
                <div>
                    <button data-action="1" data-insurance-index="${index}">Check Status</button>
                </div>
            </li>
            `;
        });

        insuredFlightsList.innerHTML = html;
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

    async fetchFlightStatus(airline, flight, timestamp) {



        this.contract.fetchFlightStatus(airline, flight, timestamp)
            .then((result) => {
                console.log(result);
                display(
                    'Oracles',
                    'Fetching flight status from oracles',
                    [
                        { label: 'Flight', value: flight}
                     ]
                );

            })
            .catch((error) => {
                console.log(error, result);
            });
    }

}

const Application = new App();

/* Event Listeners *************************** */

document.addEventListener('click', (ev) => {
    if (!ev.target.dataset.action) return;

    const action = parseFloat(ev.target.dataset.action);

    switch(action) {
        case 0:
            const flight = DOM.elid('purchase-insurance-flights').value.split("-");
            const amount = DOM.elid('purchase-insurance-amount').value;
            Application.purchaseInsurance(flight, amount);
            break;
        case 1:
            const insuranceIndex = ev.target.dataset.insuranceIndex;
            const insurance = Application.insurances[insuranceIndex];
            Application.fetchFlightStatus(insurance.airline, insurance.flight, insurance.timestamp);
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
