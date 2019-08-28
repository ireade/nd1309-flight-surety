

function getJson(path) {
    return fetch(path).then((res) => res.json());
}


App = {
    web3Provider: null,
    FlightSuretyApp: {},

    init: async function () {
        App.config = await getJson('./config.json');
        console.log(App.config);

        return await App.initWeb3();
    },

    initWeb3: async function () {

        if (window.ethereum) {
            App.web3Provider = window.ethereum;

            try {
                await window.ethereum.enable();
                console.log("Connected to web3 via window.ethereum");
            } catch (error) {
                console.error("User denied account access");
            }
        } else if (window.web3) {
            App.web3Provider = window.web3.currentProvider;
            console.log("Connected to web3 via window.web3.currentProvider");
        } else {
            console.warn("No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live",);
            App.web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:9545");
        }

        App.getMetamaskAccountID();

        return App.initContracts();
    },

    getMetamaskAccountID: async function () {
        web3 = new Web3(App.web3Provider);

        web3.eth.getAccounts(function (err, accounts) {
            if (err) return console.log('Error getting accounts:', err);

            App.metamaskAccountID = accounts[0];
            console.log('metamaskAccountID:', accounts[0]);
        });

    },

    initContracts: async function () {


        const flightSuretyApp = await getJson('./FlightSuretyApp.json');
        App.FlightSuretyApp = TruffleContract(flightSuretyApp.abi);

        console.log(App.FlightSuretyApp)

        App.isOperational();
    },


    /* Contract Functions */

    isOperational: async function () {

        console.log("isOperational:");

        App.FlightSuretyData.deployed().then((instance) => {

            console.log(instance);

        })

        // console.log(instance);
        //
        // const result = instance.isOperational();
        //
        // console.log(result);


    }
};


window.addEventListener('load', () => {
    App.init();
});
