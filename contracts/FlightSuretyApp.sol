pragma solidity >=0.4.24;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyApp {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                GLOBAL DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;
    bool private operational = true;

    FlightSuretyData flightSuretyData;
    address flightSuretyDataContractAddress;


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
    /*                           CONSTRUCTOR & UTILITY FUNCTIONS                                */
    /********************************************************************************************/

    constructor(address dataContractAddress) public
    {
        contractOwner = msg.sender;

        flightSuretyDataContractAddress = dataContractAddress;
        flightSuretyData = FlightSuretyData(flightSuretyDataContractAddress);


        // Initial flights

        bytes32 flightKey1 = getFlightKey(contractOwner, "FLIGHT1", now);
        flights[flightKey1] = Flight(STATUS_CODE_UNKNOWN, now, contractOwner, "FLIGHT1");
        flightsKeyList.push(flightKey1);

        bytes32 flightKey2 = getFlightKey(contractOwner, "FLIGHT2", now);
        flights[flightKey2] = Flight(STATUS_CODE_UNKNOWN, now, contractOwner, "FLIGHT2");
        flightsKeyList.push(flightKey2);

        bytes32 flightKey3 = getFlightKey(contractOwner, "FLIGHT3", now);
        flights[flightKey3] = Flight(STATUS_CODE_UNKNOWN, now, contractOwner, "FLIGHT3");
        flightsKeyList.push(flightKey3);
    }

    function isOperational() public view returns (bool)
    {
        return operational;
    }

    function setOperatingStatus (bool mode) external requireContractOwner
    {
        operational = mode;
    }


    /********************************************************************************************/
    /*                                     AIRLINE FUNCTIONS                                    */
    /********************************************************************************************/

    uint8 private constant NO_AIRLINES_REQUIRED_FOR_CONSENSUS_VOTING = 4;

    event AirlineApplied(address airline);
    event AirlineRegistered(address airline);
    event AirlinePaid(address airline);


    function applyForAirlineRegistration(string airlineName) external
    {
        flightSuretyData.createAirline(msg.sender, 0, airlineName);
        emit AirlineApplied(msg.sender);
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
            emit AirlineRegistered(airline);
        }
    }

    function payAirlineDues() external payable onlyRegisteredAirlines
    {
        require(msg.value == 10 ether, "Payment of 10 ether is required");

        flightSuretyDataContractAddress.transfer(msg.value);
        flightSuretyData.updateAirlineState(msg.sender, 2);

        emit AirlinePaid(msg.sender);
    }


    /********************************************************************************************/
    /*                         PASSENGER INSURANCE FUNCTIONS                                    */
    /********************************************************************************************/

    uint public constant MAX_INSURANCE_AMOUNT = 1 ether;

    event PassengerInsuranceBought(address passenger, bytes32 flightKey);


    function purchaseInsurance(bytes32 flightKey)
    external payable
    {
        require(bytes(flights[flightKey].flight).length > 0, "Flight does not exist");

        // @todo: make sure insurance doesn't already exist

        require(msg.value <= MAX_INSURANCE_AMOUNT, "Passengers can buy a maximum of 1 ether for insurance");

        flightSuretyDataContractAddress.transfer(msg.value);
        flightSuretyData.createInsurance(msg.sender, flightKey, msg.value);

        emit PassengerInsuranceBought(msg.sender, flightKey);
    }


    /********************************************************************************************/
    /*                                   FLIGHTS FUNCTIONS                                      */
    /********************************************************************************************/

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
        string flight;
    }

    mapping(bytes32 => Flight) private flights;
    bytes32[] private flightsKeyList;

    event FlightStatusProcessed(address airline, string flight, uint8 statusCode);


    function getFlightsKeyList() public view returns(bytes32[])
    {
        return flightsKeyList;
    }

    function registerFlight(uint8 status, string flight)
    external
    onlyPaidAirlines
    {
        bytes32 flightKey = getFlightKey(msg.sender, flight, now);

        flights[flightKey] = Flight(status, now, msg.sender, flight);
        flightsKeyList.push(flightKey);
    }

    function processFlightStatus(address airline, string memory flight, uint256 timestamp, uint8 statusCode)
    private
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey].statusCode = statusCode;

        emit FlightStatusProcessed(airline, flight, statusCode);
    }

    function fetchFlightStatus(bytes32 flightKey)
    external
    {
        Flight memory flight = flights[flightKey];

        uint8 index = getRandomIndex(msg.sender);

        bytes32 key = keccak256(abi.encodePacked(index, flight.airline, flight.flight, flight.updatedTimestamp));

        oracleResponses[key] = ResponseInfo({
                requester : msg.sender,
                isOpen : true
            });

        emit OracleRequest(index, flight.airline, flight.flight, flight.updatedTimestamp);
    }

    function fetchFlightStatusWithoutKey(address airline, string flight, uint256 timestamp)
    external
    {
        uint8 index = getRandomIndex(msg.sender);

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

    uint8 private nonce = 0;

    uint256 public constant REGISTRATION_FEE = 1 ether;

    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    mapping(address => Oracle) private oracles;

    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
    }

    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;


    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    function registerOracle() external payable
    {
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({ isRegistered : true, indexes : indexes });
    }

    function getMyIndexes() view external returns (uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

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
        require(
            (oracles[msg.sender].indexes[0] == index) ||
            (oracles[msg.sender].indexes[1] == index) ||
            (oracles[msg.sender].indexes[2] == index),
                "Index does not match oracle request"
        );

        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        emit OracleReport(airline, flight, timestamp, statusCode);

        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(address airline, string flight, uint256 timestamp)
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function generateIndexes(address account) internal returns (uint8[3])
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

    function getRandomIndex(address account) internal returns (uint8)
    {
        uint8 maxValue = 10;

        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;
        }

        return random;
    }

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
