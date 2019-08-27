pragma solidity >=0.4.24;

import "./SafeMath.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20; // only code that results in payout
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;
    bool private operational = true;

    FlightSuretyData flightSuretyData;

    // Flight

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    mapping(bytes32 => Flight) private flights;

    // Airline

    enum AirlineState {
        Applied,
        Registered,
        Paid
    }

    struct Airline {
        address airlineAddress;
        AirlineState state;
        string name;

        // Approvals
        mapping(address => bool) approvals;
        uint8 approvalCount;
    }

    mapping(address => Airline) private airlines;

    uint256 private totalPaidAirlines = 0;

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
        require(airlines[msg.sender].state == AirlineState.Registered, "Only registered allowed");
        _;
    }

    modifier onlyPaidAirlines()
    {
        require(airlines[msg.sender].state == AirlineState.Paid, "Only paid airlines allowed");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    constructor(address flightSuretyDataContractAddress) public
    {
        contractOwner = msg.sender;
        flightSuretyData = FlightSuretyData(flightSuretyDataContractAddress);

        // @todo: Change to Registered and wait for payment
        airlines[msg.sender] = Airline(msg.sender, AirlineState.Paid, "First Airline", 0);
        totalPaidAirlines++;
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

    function getAirlineState(address airline) external view returns (AirlineState)
    {
        return airlines[airline].state;
    }

    function applyForAirlineRegistration(string airlineName) external
    {
        require(airlines[msg.sender].airlineAddress == address(0), "Airline already in queue");

        airlines[msg.sender] = Airline(
                msg.sender,
                AirlineState.Applied,
                airlineName,
                0
        );

        // todo: Event: New airline application
    }

    function approveAirlineRegistration(address airline) external onlyPaidAirlines returns(bool approved)
    {
        require(airlines[airline].state == AirlineState.Applied, "This airline hasn't applied for approval");

        approved = false;

        if (totalPaidAirlines < NO_AIRLINES_REQUIRED_FOR_CONSENSUS_VOTING) {

            approved = true;

        } else {

            require(!airlines[airline].approvals[msg.sender], "Caller has already given approval");

            airlines[airline].approvals[msg.sender] = true;
            airlines[airline].approvalCount++;

            uint256 approvalsRequired = totalPaidAirlines / 2; // @todo: use SafeMath
            if (airlines[airline].approvalCount >= approvalsRequired) approved = true;
        }

        if (approved) {
            airlines[airline].state = AirlineState.Registered;
        }

        // todo: emit event is approved is true

        return approved;
    }

    function payAirlineDues() external payable onlyRegisteredAirlines
    {
        require(msg.value == 10 ether, "Payment of 10 ether is required");

        airlines[msg.sender].state = AirlineState.Paid;
        totalPaidAirlines++;

        // @todo: emit paid event
    }


    /* Flights flow ********************** */


    /**
     * @dev Register a future flight for insuring.
     *
     */
    function registerFlight
    (
    )
    external
    pure
    {
        // not necessary, could have list of flights hard-coded
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

}
