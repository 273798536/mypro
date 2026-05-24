const { BATCH_STATUSES, ACTIONS } = require('../database/schema');
const logger = require('../utils/logger');

const stateTransitions = {
  [BATCH_STATUSES.DRAFT]: {
    allowedActions: [ACTIONS.SUBMIT, ACTIONS.UPLOAD_ATTACHMENT, ACTIONS.CANCEL],
    nextStates: {
      [ACTIONS.SUBMIT]: BATCH_STATUSES.SUBMITTED,
      [ACTIONS.CANCEL]: BATCH_STATUSES.CANCELLED
    }
  },
  [BATCH_STATUSES.SUBMITTED]: {
    allowedActions: [ACTIONS.REVIEW, ACTIONS.FREEZE, ACTIONS.UPLOAD_ATTACHMENT],
    nextStates: {
      [ACTIONS.REVIEW]: BATCH_STATUSES.UNDER_REVIEW
    }
  },
  [BATCH_STATUSES.UNDER_REVIEW]: {
    allowedActions: [ACTIONS.REVIEW, ACTIONS.OVERRULE, ACTIONS.FREEZE, ACTIONS.UPLOAD_ATTACHMENT],
    nextStates: {
      [ACTIONS.REVIEW]: BATCH_STATUSES.REVIEW_PASSED,
      [ACTIONS.OVERRULE]: BATCH_STATUSES.REVIEW_REJECTED
    }
  },
  [BATCH_STATUSES.REVIEW_PASSED]: {
    allowedActions: [ACTIONS.FREEZE, ACTIONS.SETTLE, ACTIONS.ARCHIVE],
    nextStates: {
      [ACTIONS.SETTLE]: BATCH_STATUSES.SETTLED,
      [ACTIONS.ARCHIVE]: BATCH_STATUSES.ARCHIVED
    }
  },
  [BATCH_STATUSES.REVIEW_REJECTED]: {
    allowedActions: [ACTIONS.REVIEW, ACTIONS.OVERRULE, ACTIONS.FREEZE, ACTIONS.UPLOAD_ATTACHMENT],
    nextStates: {
      [ACTIONS.REVIEW]: BATCH_STATUSES.UNDER_REVIEW,
      [ACTIONS.OVERRULE]: BATCH_STATUSES.REVIEW_PASSED
    }
  },
  [BATCH_STATUSES.FROZEN]: {
    allowedActions: [ACTIONS.UNFREEZE],
    nextStates: {}
  },
  [BATCH_STATUSES.SETTLED]: {
    allowedActions: [ACTIONS.ARCHIVE],
    nextStates: {
      [ACTIONS.ARCHIVE]: BATCH_STATUSES.ARCHIVED
    }
  },
  [BATCH_STATUSES.ARCHIVED]: {
    allowedActions: [],
    nextStates: {}
  },
  [BATCH_STATUSES.CANCELLED]: {
    allowedActions: [],
    nextStates: {}
  }
};

function canTransition(currentStatus, action) {
  const stateConfig = stateTransitions[currentStatus];
  if (!stateConfig) {
    logger.warn(`Unknown status: ${currentStatus}`);
    return false;
  }
  return stateConfig.allowedActions.includes(action);
}

function getNextState(currentStatus, action) {
  const stateConfig = stateTransitions[currentStatus];
  if (!stateConfig || !stateConfig.nextStates[action]) {
    return null;
  }
  return stateConfig.nextStates[action];
}

function validateTransition(currentStatus, action) {
  if (!canTransition(currentStatus, action)) {
    throw new Error(`Invalid transition: cannot perform ${action} from status ${currentStatus}`);
  }
  return true;
}

function isFrozenState(status) {
  return status === BATCH_STATUSES.FROZEN;
}

function isTerminalState(status) {
  return [BATCH_STATUSES.ARCHIVED, BATCH_STATUSES.CANCELLED].includes(status);
}

function getAllowedActions(status) {
  const stateConfig = stateTransitions[status];
  return stateConfig ? stateConfig.allowedActions : [];
}

module.exports = {
  stateTransitions,
  canTransition,
  getNextState,
  validateTransition,
  isFrozenState,
  isTerminalState,
  getAllowedActions
};
