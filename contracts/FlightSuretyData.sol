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
        require(authorizedCallers[msg.sender] || (msg.sender == contractOwner), "Caller is not authorised");
        _;
    }


    /********************************************************************************************/
    /*                           CONSTRUCTOR & UTILITY FUNCTIONS                                */
    /********************************************************************************************/

    constructor()
    public
    {
        contractOwner = msg.sender;

        airlines[contractOwner] = Airline(contractOwner, AirlineState.Paid, "First Airline", 0);
        totalPaidAirlines++;
    }

    function()
    external
    payable
    {
    }

    function isOperational()
    public
    view
    returns (bool)
    {
        return operational;
    }

    function setOperatingStatus(bool mode) external requireContractOwner
    {
        operational = mode;
    }

    function setCallerAuthorizationStatus(address caller, bool status)
    external
    requireContractOwner
    returns (bool)
    {
        authorizedCallers[caller] = status;
        return authorizedCallers[caller];
    }

    function getCallerAuthorizationStatus(address caller)
    public
    view
    requireContractOwner
    returns (bool)
    {
        return authorizedCallers[caller];
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
        string flight;
        uint256 amount;
        uint256 payoutAmount;
        InsuranceState state;
    }

    mapping(address => mapping(string => Insurance)) private passengerInsurances;
    mapping(address => uint256) private passengerBalances;


    function getInsurance(address passenger, string flight)
    external
    view
    requireCallerAuthorized
    returns (uint256 amount, uint256 payoutAmount, InsuranceState state)
    {
        amount = passengerInsurances[passenger][flight].amount;
        payoutAmount = passengerInsurances[passenger][flight].payoutAmount;
        state = passengerInsurances[passenger][flight].state;
    }

    function createInsurance(address passenger, string flight, uint256 amount, uint256 payoutAmount)
    external
    requireCallerAuthorized
    {
        require(passengerInsurances[passenger][flight].amount != amount, "Insurance already exists");

        passengerInsurances[passenger][flight] = Insurance(flight, amount, payoutAmount, InsuranceState.Bought);
    }

    function claimInsurance(address passenger, string flight)
    external
    requireCallerAuthorized
    {
        require(passengerInsurances[passenger][flight].state == InsuranceState.Bought, "Insurance already claimed");

        passengerInsurances[passenger][flight].state = InsuranceState.Claimed;

        passengerBalances[passenger] = passengerBalances[passenger] + passengerInsurances[passenger][flight].payoutAmount;
    }

    function getPassengerBalance(address passenger)
    external
    view
    requireCallerAuthorized
    returns (uint256)
    {
        return passengerBalances[passenger];
    }

    function payPassenger(address passenger)
    external
    requireCallerAuthorized
    {
        require(passengerBalances[passenger] > 0, "Passenger doesn't have enough to withdraw that amount");

        passengerBalances[passenger] = 0;

        passenger.transfer(passengerBalances[passenger]);
    }


}

