pragma solidity >=0.4.24;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                GLOBAL DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;
    bool private operational = true;
    mapping(address => bool) private authorizedCallers;


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

    modifier requireCallerAuthorized()
    {
        require((msg.sender == contractOwner) || authorizedCallers[msg.sender], "Caller is not authorised");
        _;
    }


    /********************************************************************************************/
    /*                           CONSTRUCTOR & UTILITY FUNCTIONS                                */
    /********************************************************************************************/

    constructor() public
    {
        contractOwner = msg.sender;

        airlines[contractOwner] = Airline(contractOwner, AirlineState.Paid, "First Airline", 0);
        totalPaidAirlines++;
    }

    function()
    external
    payable
    {
        // @todo: move fallback function to app
    }

    function isOperational() public view returns (bool)
    {
        return operational;
    }

    function setOperatingStatus(bool mode) external requireContractOwner
    {
        operational = mode;
    }

    function setCallerAuthorizationStatus(address caller, bool status) external requireContractOwner
    {
        authorizedCallers[caller] = status;
    }

    function getCallerAuthorizationStatus(address caller) public view requireContractOwner returns (bool)
    {
        return authorizedCallers[caller] || false;
    }


    /********************************************************************************************/
    /*                                     AIRLINE FUNCTIONS                                    */
    /********************************************************************************************/

    enum AirlineState {
        Applied,
        Registered,
        Paid
    }

    struct Airline {
        address airlineAddress;
        AirlineState state;
        string name;

        mapping(address => bool) approvals;
        uint8 approvalCount;
    }

    mapping(address => Airline) internal airlines;
    uint256 internal totalPaidAirlines = 0;


    function getAirlineState(address airline)
    external
    view
    requireCallerAuthorized
    returns (AirlineState)
    {
        return airlines[airline].state;
    }

    function createAirline(address airlineAddress, uint8 state, string name)
    external
    requireCallerAuthorized
    {
        airlines[airlineAddress] = Airline(airlineAddress, AirlineState(state), name, 0);
    }

    function updateAirlineState(address airlineAddress, uint8 state)
    external
    requireCallerAuthorized
    {
        airlines[airlineAddress].state = AirlineState(state);
        if (state == 2) totalPaidAirlines++;
    }

    function getTotalPaidAirlines()
    external
    view
    requireCallerAuthorized
    returns (uint256)
    {
        return totalPaidAirlines;
    }

    function approveAirlineRegistration(address airline, address approver)
    external
    requireCallerAuthorized
    returns (uint8)
    {
        require(!airlines[airline].approvals[approver], "Caller has already given approval");

        airlines[airline].approvals[approver] = true;
        airlines[airline].approvalCount++;

        return airlines[airline].approvalCount;
    }


    /********************************************************************************************/
    /*                         PASSENGER INSURANCE FUNCTIONS                                    */
    /********************************************************************************************/

    enum InsuranceState {
        Bought,
        Claimed
    }

    struct Insurance {
        bytes32 flightKey;
        uint256 amount;
        InsuranceState state;
    }

    mapping(address => mapping(bytes32 => Insurance)) passengerInsurances;
    mapping(address => uint256) passengerBalances;


    function getInsuranceState(address passenger, bytes32 flightKey)
    external
    view
    requireCallerAuthorized
    returns (InsuranceState)
    {
        return passengerInsurances[passenger][flightKey].state;
    }

    function createInsurance(address passenger, bytes32 flightKey, uint256 amount)
    external
    requireCallerAuthorized
    {
        require(passengerInsurances[passenger][flightKey].amount != amount, "Insurance already exists");

        passengerInsurances[passenger][flightKey] = Insurance(flightKey, amount, InsuranceState.Bought);
    }

    function claimInsurance(address passenger, bytes32 flightKey)
    external
    requireCallerAuthorized
    {
        passengerInsurances[passenger][flightKey].state = InsuranceState.Claimed;
        creditPassengerBalance(passenger, passengerInsurances[passenger][flightKey].amount);
    }

    function creditPassengerBalance(address passenger, uint256 amount)
    private
    requireCallerAuthorized
    {
        passengerBalances[passenger] = passengerBalances[passenger] + amount;
    }

    function getPassengerBalance()
    external
    view
    returns (uint256)
    {
        return passengerBalances[msg.sender];
    }

    function payPassenger(address passenger, uint256 amount)
    external
    requireCallerAuthorized
    {
        require(passengerBalances[passenger] >= amount, "Passenger doesn't have enough to withdraw that amount");

        passengerBalances[passenger] = passengerBalances[passenger] - amount;

        passenger.transfer(amount);
    }


}

