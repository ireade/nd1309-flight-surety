pragma solidity >=0.4.24;

import "./SafeMath.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;
    bool private operational = true;

    FlightSuretyData flightSuretyData;
    address flightSuretyDataContractAddress;

    // Flight

    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20; // only code that results in payout
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct Flight {
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
        string code;
    }

    mapping(bytes32 => Flight) private flights;

    // Airline

    uint8 private constant NO_AIRLINES_REQUIRED_FOR_CONSENSUS_VOTING = 4;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // @todo


    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;
    }

    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier onlyRegisteredAirlines()
    {
        require(flightSuretyData.getAirlineState(msg.sender) == 1, "Only registered allowed");
        _;
    }

    modifier onlyPaidAirlines()
    {
        require(flightSuretyData.getAirlineState(msg.sender) == 2, "Only paid airlines allowed");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    constructor(address dataContractAddress) public
    {
        contractOwner = msg.sender;

        flightSuretyDataContractAddress = dataContractAddress;
        flightSuretyData = FlightSuretyData(flightSuretyDataContractAddress);

        // @todo: fix?
        for(var i = 0; i < 3; i++) {
            bytes32 flightKey = getFlightKey(msg.sender, i, now);
            flights[flightKey] = Flight(20, now, msg.sender, i);
        }
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() public view returns (bool)
    {
        return operational;
    }

    function setOperatingStatus (bool mode) external requireContractOwner
    {
        operational = mode;
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /* Airline flow ********************** */

    function applyForAirlineRegistration(string airlineName) external
    {
        flightSuretyData.createAirline(msg.sender, 0, airlineName);

        // @todo emit event
    }

    function approveAirlineRegistration(address airline) external onlyPaidAirlines
    {
        require(flightSuretyData.getAirlineState(airline) == 0, "This airline hasn't applied for approval");

        bool approved = false;
        uint256 totalPaidAirlines = flightSuretyData.getTotalPaidAirlines();

        if (totalPaidAirlines < NO_AIRLINES_REQUIRED_FOR_CONSENSUS_VOTING) {
            approved = true;
        } else {
            uint8 approvalCount = flightSuretyData.approveAirlineRegistration(airline, msg.sender);
            uint256 approvalsRequired = totalPaidAirlines / 2;
            if (approvalCount >= approvalsRequired) approved = true;
        }

        if (approved) {
            flightSuretyData.updateAirlineState(airline, 1);
            // @todo emit event
        }
    }

    function payAirlineDues() external payable onlyRegisteredAirlines
    {
        require(msg.value == 10 ether, "Payment of 10 ether is required");

        flightSuretyDataContractAddress.transfer(msg.value);

        flightSuretyData.updateAirlineState(msg.sender, 2);

        // @todo: emit paid event
    }


    /* Passenger flow ********************** */

    function purchaseInsurance(bytes32 flight) external payable
    {
        // @todo: make sure flight exists

        require(msg.value <= 1 ether, "Passengers can buy a maximum of 1 ether for insurance");

        flightSuretyDataContractAddress.transfer(msg.value);

        flightSuretyData.createInsurance(msg.sender, flight, msg.value);
    }

    function claimInsurance(bytes32 flight) external
    {
        // @todo: fetchFlightStatus

        // @todo: call creditInsuree
    }


    /* Flights flow ********************** */

    function registerFlight(uint8 status, string code)
    external
    onlyPaidAirlines
    {
        bytes32 flightKey = getFlightKey(msg.sender, code, now);

        flights[flightKey] = Flight(status, now, msg.sender, code);
    }

    function getFlightStatus(bytes32 flight) public view returns(uint8)
    {
        return flights[flightKey].status;
    }

    /**
     * @dev Called after oracle has updated flight status
     *
     */
    function processFlightStatus
    (
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    )
    internal
    pure
    {
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester : msg.sender,
            isOpen : true
            });

        emit OracleRequest(index, airline, flight, timestamp);
    }



    /********************************************************************************************/
    /*                                     ORACLE MANAGEMENT                                    */
    /********************************************************************************************/

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
    (
    )
    external
    payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
            isRegistered : true,
            indexes : indexes
            });
    }

    function getMyIndexes
    (
    )
    view
    external
    returns (uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
    (
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
    )
    external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
    (
        address account
    )
    internal
    returns (uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
    (
        address account
    )
    internal
    returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;
            // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

    // endregion

}


/********************************************************************************************/
/*                               STUB FOR DATA CONTRACT                                     */
/********************************************************************************************/

contract FlightSuretyData {

    function getAirlineState(address airline) view returns(uint)
    {
        return 1;
    }

    function createAirline(address airlineAddress, uint8 state, string name) view
    {}

    function updateAirlineState(address airlineAddress, uint8 state) view
    {}

    function getTotalPaidAirlines() view returns(uint)
    {
        return 1;
    }

    function approveAirlineRegistration(address airline, address approver) view returns (uint8)
    {
        return 1;
    }

    ///

    function createInsurance(address passenger, bytes32 flight, uint256 amount)
    {}

}
