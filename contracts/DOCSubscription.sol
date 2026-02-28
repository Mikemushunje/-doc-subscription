// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error Subscription__AlreadyActive();
error Subscription__NotActive();
error Subscription__NotSubscriber();
error Subscription__InvalidAddress();
error Subscription__ZeroAmount();
error Subscription__ZeroInterval();
error Subscription__TooEarlyToCharge();
error Subscription__InsufficientAllowance();
error Subscription__TransferFailed();

contract DOCSubscription is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable i_docToken;
    
    address public s_subscriber;
    address public s_receiver;
    uint256 public s_amountDOC;
    uint256 public s_intervalSeconds;
    uint256 public s_nextDueTimestamp;
    bool public s_active;

    event SubscriptionCreated(
        address indexed subscriber, 
        address indexed receiver, 
        uint256 amount, 
        uint256 interval
    );
    event PaymentCharged(
        uint256 amount, 
        uint256 timestamp, 
        uint256 nextDue
    );
    event SubscriptionCanceled();

    constructor(
        address _subscriber,
        address _receiver,
        uint256 _amountDOC,
        uint256 _intervalSeconds,
        address _docTokenAddress
    ) {
        if (_subscriber == address(0)) revert Subscription__InvalidAddress();
        if (_receiver == address(0)) revert Subscription__InvalidAddress();
        if (_docTokenAddress == address(0)) revert Subscription__InvalidAddress();
        if (_amountDOC == 0) revert Subscription__ZeroAmount();
        if (_intervalSeconds == 0) revert Subscription__ZeroInterval();

        s_subscriber = _subscriber;
        s_receiver = _receiver;
        s_amountDOC = _amountDOC;
        s_intervalSeconds = _intervalSeconds;
        s_nextDueTimestamp = block.timestamp + _intervalSeconds;
        s_active = true;
        i_docToken = IERC20(_docTokenAddress);

        emit SubscriptionCreated(_subscriber, _receiver, _amountDOC, _intervalSeconds);
    }

    function charge() external nonReentrant {
        if (!s_active) revert Subscription__NotActive();
        if (block.timestamp < s_nextDueTimestamp) revert Subscription__TooEarlyToCharge();
        
        uint256 allowance = i_docToken.allowance(s_subscriber, address(this));
        if (allowance < s_amountDOC) revert Subscription__InsufficientAllowance();

        uint256 newDueTimestamp = s_nextDueTimestamp + s_intervalSeconds;
        s_nextDueTimestamp = newDueTimestamp;

        i_docToken.safeTransferFrom(s_subscriber, s_receiver, s_amountDOC);

        emit PaymentCharged(s_amountDOC, block.timestamp, newDueTimestamp);
    }

    function cancelSubscription() external {
        if (msg.sender != s_subscriber) revert Subscription__NotSubscriber();
        if (!s_active) revert Subscription__NotActive();
        
        s_active = false;
        s_nextDueTimestamp = 0;
        
        emit SubscriptionCanceled();
    }

    function getSubscriptionDetails() external view returns (
        address subscriber,
        address receiver,
        uint256 amountDOC,
        uint256 intervalSeconds,
        uint256 nextDueTimestamp,
        uint256 currentAllowance,
        bool active
    ) {
        return (
            s_subscriber,
            s_receiver,
            s_amountDOC,
            s_intervalSeconds,
            s_nextDueTimestamp,
            i_docToken.allowance(s_subscriber, address(this)),
            s_active
        );
    }

    function timeUntilNextCharge() external view returns (uint256) {
        if (block.timestamp >= s_nextDueTimestamp) return 0;
        return s_nextDueTimestamp - block.timestamp;
    }
}