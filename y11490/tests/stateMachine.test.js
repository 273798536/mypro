const stateMachine = require('../src/state-machine');
const { BATCH_STATUSES, ACTIONS } = require('../src/database/schema');

describe('State Machine', () => {
  describe('canTransition', () => {
    test('DRAFT can SUBMIT', () => {
      expect(stateMachine.canTransition(BATCH_STATUSES.DRAFT, ACTIONS.SUBMIT)).toBe(true);
    });

    test('DRAFT can CANCEL', () => {
      expect(stateMachine.canTransition(BATCH_STATUSES.DRAFT, ACTIONS.CANCEL)).toBe(true);
    });

    test('DRAFT cannot FREEZE directly', () => {
      expect(stateMachine.canTransition(BATCH_STATUSES.DRAFT, ACTIONS.FREEZE)).toBe(false);
    });

    test('SUBMITTED can REVIEW', () => {
      expect(stateMachine.canTransition(BATCH_STATUSES.SUBMITTED, ACTIONS.REVIEW)).toBe(true);
    });

    test('FROZEN can only UNFREEZE', () => {
      expect(stateMachine.canTransition(BATCH_STATUSES.FROZEN, ACTIONS.UNFREEZE)).toBe(true);
      expect(stateMachine.canTransition(BATCH_STATUSES.FROZEN, ACTIONS.REVIEW)).toBe(false);
    });

    test('ARCHIVED is terminal state', () => {
      expect(stateMachine.canTransition(BATCH_STATUSES.ARCHIVED, ACTIONS.SUBMIT)).toBe(false);
      expect(stateMachine.isTerminalState(BATCH_STATUSES.ARCHIVED)).toBe(true);
    });
  });

  describe('getNextState', () => {
    test('SUBMIT from DRAFT goes to SUBMITTED', () => {
      expect(stateMachine.getNextState(BATCH_STATUSES.DRAFT, ACTIONS.SUBMIT)).toBe(BATCH_STATUSES.SUBMITTED);
    });

    test('REVIEW from SUBMITTED goes to UNDER_REVIEW', () => {
      expect(stateMachine.getNextState(BATCH_STATUSES.SUBMITTED, ACTIONS.REVIEW)).toBe(BATCH_STATUSES.UNDER_REVIEW);
    });

    test('REVIEW from UNDER_REVIEW goes to REVIEW_PASSED', () => {
      expect(stateMachine.getNextState(BATCH_STATUSES.UNDER_REVIEW, ACTIONS.REVIEW)).toBe(BATCH_STATUSES.REVIEW_PASSED);
    });
  });

  describe('validateTransition', () => {
    test('valid transition does not throw', () => {
      expect(() => stateMachine.validateTransition(BATCH_STATUSES.DRAFT, ACTIONS.SUBMIT)).not.toThrow();
    });

    test('invalid transition throws error', () => {
      expect(() => stateMachine.validateTransition(BATCH_STATUSES.DRAFT, ACTIONS.FREEZE)).toThrow();
    });
  });
});
