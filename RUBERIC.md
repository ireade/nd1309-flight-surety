# Project Ruberic

https://review.udacity.com/#!/rubrics/1711/view

## Separation of Concerns, Operational Control and “Fail Fast”

- [x] Smart Contract Separation
- [x] Dapp Created and Used for Contract Calls
- [x] Oracle Server Application
- [x] Operational status control is implemented in contracts
- [x] Contract functions “fail fast” by having a majority of “require()” calls at the beginning of function body


## Airlines

- [x] First airline is registered when contract is deployed.
- [x] Only existing airline may register a new airline until there are at least four airlines registered (+ test)
- [x] Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines (+ test)
- [x] Airline can be registered, but does not participate in contract until it submits funding of 10 ether (+ test)


## Passengers

- [x] Passengers can choose from a fixed list of flight numbers and departure that are defined in the Dapp client
- [x] Passengers may pay up to 1 ether for purchasing flight insurance.
- [x] If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid
- [x] Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout
- [x] Insurance payouts are not sent directly to passenger’s wallet


## Oracles (Server App)

- [x] Oracle functionality is implemented in the server app.
- [x] Upon startup, 20+ oracles are registered and their assigned indexes are persisted in memory
- [x] Update flight status requests from client Dapp result in OracleRequest event emitted by Smart Contract that is captured by server (displays on console and handled in code)
- [x] Server will loop through all registered oracles, identify those oracles for which the OracleRequest event applies, and respond by calling into FlightSuretyApp contract with random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30), Late Technical (40), or Late Other (50)
