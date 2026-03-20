// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract BaqalaHisaab {
    struct HisaabRecord {
        uint256 debt;
        uint256 creditLimit;
        bool isApproved;
        uint256 lastUpdated;
    }

    // Mapping: Baqala Address -> Customer Address/ID -> HisaabRecord
    mapping(address => mapping(string => HisaabRecord)) public ledgers;
    
    event HisaabApproved(address indexed baqala, string customerId, uint256 creditLimit);
    event DailyLedgerSynced(address indexed baqala, string customerId, uint256 newDebt);
    event DebtSettled(address indexed baqala, string customerId, uint256 amountPaid, uint256 remainingDebt);

    // Baqala approves a customer with a specific limit
    function approveHisaab(string memory _customerId, uint256 _creditLimit) public {
        ledgers[msg.sender][_customerId].isApproved = true;
        ledgers[msg.sender][_customerId].creditLimit = _creditLimit;
        emit HisaabApproved(msg.sender, _customerId, _creditLimit);
    }

    // Baqala syncs the daily off-chain transactions to the blockchain
    function syncDailyLedger(string memory _customerId, uint256 _newDebtAmount) public {
        require(ledgers[msg.sender][_customerId].isApproved, "Customer not approved for Hisaab");
        require(_newDebtAmount <= ledgers[msg.sender][_customerId].creditLimit, "Exceeds Credit Limit");
        
        ledgers[msg.sender][_customerId].debt = _newDebtAmount;
        ledgers[msg.sender][_customerId].lastUpdated = block.timestamp;
        
        emit DailyLedgerSynced(msg.sender, _customerId, _newDebtAmount);
    }

    // Customer pays off their debt via Crypto
    function settleDebt(address _baqala, string memory _customerId) public payable {
        require(msg.value > 0, "Must send ETH/Crypto to settle");
        require(ledgers[_baqala][_customerId].debt > 0, "No debt to settle");

        // In a real app, you'd convert msg.value (ETH/MATIC) to AED using an Oracle (Chainlink)
        // For MVP, we assume 1 wei = 1 AED smallest unit for simplicity.
        uint256 payment = msg.value; 
        
        if (payment >= ledgers[_baqala][_customerId].debt) {
            ledgers[_baqala][_customerId].debt = 0;
        } else {
            ledgers[_baqala][_customerId].debt -= payment;
        }

        // Forward payment to Baqala
        payable(_baqala).transfer(msg.value);

        emit DebtSettled(_baqala, _customerId, payment, ledgers[_baqala][_customerId].debt);
    }
}
