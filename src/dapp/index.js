import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    const contract = new Contract('localhost', (authorized) => {

        if (!authorized) return display(
            'App contract authorization',
            'Checks if app contract is authorized to make calls to data contract',
            [ { label: 'Status', value: authorized} ]
        );

        contract.isOperational((error, result) => {
            display(
                'Operational Status',
                'Checks if contract is operational',
                [ { label: 'Status', error: error, value: result} ]
            );
        });

        contract.getFlights((error, flights) => {
            const purchaseInsuranceSelect = DOM.elid('purchase-insurance-flights');
            const checkStatusSelect = DOM.elid('check-status-flights');

            flights.forEach((flight) => {
                const option = document.createElement('option');
                option.value = `${flight.airline}-${flight.flight}-${flight.timestamp}`;
                const prettyDate = new Date(flight.timestamp * 1000).toDateString();
                option.textContent = `${flight.flight} on ${prettyDate}`;
                purchaseInsuranceSelect.appendChild(option);
            });

            flights.forEach((flight) => {
                const option = document.createElement('option');
                option.value = `${flight.airline}-${flight.flight}-${flight.timestamp}`;
                const prettyDate = new Date(flight.timestamp * 1000).toDateString();
                option.textContent = `${flight.flight} on ${prettyDate}`;
                checkStatusSelect.appendChild(option);
            });
        });


        /* Events interactions */


        /* User interactions */

        DOM.elid('purchase-insurance').addEventListener('click', () => {
            let flight = DOM.elid('purchase-insurance-flights').value;
            flight = flight.split("-");
            const amount = DOM.elid('purchase-insurance-amount').value;

            contract.purchaseInsurance(
                flight[0],
                flight[1],
                flight[2],
                amount,
                (error, result) => {
                    console.log(error, result)
                }
            );
        }); // purchase-insurance

        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('check-status-flights').value;
            flight = flight.split("-");

            contract.fetchFlightStatus(
                flight[0],
                flight[1],
                flight[2],
                (error, result) => {
                    display(
                        'Oracles',
                        'Trigger oracles',
                        [ { label: 'Fetch Flight Status', error: error, value: flight[1]} ]
                    );
                }
            );
        }); // submit-oracle

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
