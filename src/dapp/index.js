import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let result = null;

    const contract = new Contract('localhost', (foo) => {

        contract.isOperational((error, result) => {
            display(
                'Operational Status',
                'Check if contract is operational',
                [ { label: 'Operational Status', error: error, value: result} ]
            );
        });

        contract.getFlightKeyList((error, flightKeys) => {
            console.log(error, flightKeys);


            const select = DOM.elid('flight-keys');

            flightKeys.forEach((key) => {

                const option = document.createElement('option');
                option.value = key;
                option.textContent = key;
                select.appendChild(option);
            })


        });



        /* User events */
        DOM.elid('purchase-insurance').addEventListener('click', () => {
            let flightKey = DOM.elid('flight-keys').value;

            contract.purchaseInsurance(flightKey, (error, result) => {
                console.log(error, result)
            });
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
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
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







