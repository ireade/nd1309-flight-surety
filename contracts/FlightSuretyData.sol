pragma solidity >=0.4.24;

import "./SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;
    bool private operational = true;
    mapping(address => bool) private authorizedCallers;

    /* Airlines */

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



    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // todo


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
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    constructor() public
    {
        contractOwner = msg.sender;

        airlines[contractOwner] = Airline(contractOwner, AirlineState.Paid, "First Airline", 0);
        totalPaidAirlines++;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

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
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /* Airlines */

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
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/


    /**
     * @dev Buy insurance for a flight
     *
     */
    function buyInsurance
    (
    )
    external
    payable
    {

    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
    (
    )
    external
    pure
    {
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function payInsuree
    (
    )
    external
    pure
    {
    }


    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
    external
    payable
    {
        // @todo: move fallback function to app
    }


}

