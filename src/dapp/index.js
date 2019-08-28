import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    const contract = new Contract('localhost', (foo) => {

        contract.isOperational((error, result) => {
            display(
                'Operational Status',
                'Checks if contract is operational',
                [ { label: 'Status', error: error, value: result} ]
            );
        });

        contract.getFlights((error, flights) => {
            const select = DOM.elid('flight-keys');

            flights.forEach((flight) => {
                const option = document.createElement('option');
                option.value = `${flight.airline}-${flight.flight}-${flight.timestamp}`;
                option.textContent = flight.flight;
                select.appendChild(option);
            });
        });


        /* User events */

        DOM.elid('purchase-insurance').addEventListener('click', () => {
            let flight = DOM.elid('flight-keys').value;
            flight = flight.split("-");

            console.log(flight);

            contract.purchaseInsurance(
                flight[0],
                flight[1],
                flight[2],
                (error, result) => {
                    console.log(error, result)
                }
            );
        });

        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            contract.fetchFlightStatus(flight, (error, result) => {
                display(
                    'Oracles',
                    'Trigger oracles',
                    [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]
                );
            });
        })

    });

})();


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
