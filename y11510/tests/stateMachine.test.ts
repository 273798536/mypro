import { StateMachine } from '../src/services/stateMachine';
import { ExceptionStatus, Role, ActionType } from '../src/types';

describe('StateMachine', () => {
  let stateMachine: StateMachine;

  beforeEach(() => {
    stateMachine = new StateMachine();
  });

  describe('canTransition', () => {
    it('should allow transition from pending_review to approved for admin', () => {
      expect(
        stateMachine.canTransition(
          ExceptionStatus.PENDING_REVIEW,
          ExceptionStatus.APPROVED,
          Role.ADMIN
        )
      ).toBe(true);
    });

    it('should allow transition from pending_review to approved for reviewer', () => {
      expect(
        stateMachine.canTransition(
          ExceptionStatus.PENDING_REVIEW,
          ExceptionStatus.APPROVED,
          Role.REVIEWER
        )
      ).toBe(true);
    });

    it('should not allow transition from pending_review to approved for operator', () => {
      expect(
        stateMachine.canTransition(
          ExceptionStatus.PENDING_REVIEW,
          ExceptionStatus.APPROVED,
          Role.OPERATOR
        )
      ).toBe(false);
    });

    it('should allow freeze from pending_review for admin', () => {
      expect(
        stateMachine.canTransition(
          ExceptionStatus.PENDING_REVIEW,
          ExceptionStatus.FROZEN,
          Role.ADMIN
        )
      ).toBe(true);
    });

    it('should not allow freeze from pending_review for reviewer', () => {
      expect(
        stateMachine.canTransition(
          ExceptionStatus.PENDING_REVIEW,
          ExceptionStatus.FROZEN,
          Role.REVIEWER
        )
      ).toBe(false);
    });

    it('should allow unfreeze to pending_review for admin', () => {
      expect(
        stateMachine.canTransition(
          ExceptionStatus.FROZEN,
          ExceptionStatus.PENDING_REVIEW,
          Role.ADMIN
        )
      ).toBe(true);
    });

    it('should not allow transition from settled to frozen', () => {
      expect(
        stateMachine.canTransition(
          ExceptionStatus.SETTLED,
          ExceptionStatus.FROZEN,
          Role.ADMIN
        )
      ).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return correct transitions for pending_review and admin', () => {
      const transitions = stateMachine.getAllowedTransitions(
        ExceptionStatus.PENDING_REVIEW,
        Role.ADMIN
      );
      expect(transitions).toContain(ExceptionStatus.APPROVED);
      expect(transitions).toContain(ExceptionStatus.REJECTED);
      expect(transitions).toContain(ExceptionStatus.FROZEN);
      expect(transitions).toContain(ExceptionStatus.ARCHIVED);
      expect(transitions).toContain(ExceptionStatus.CANCELLED);
    });

    it('should return correct transitions for frozen and admin', () => {
      const transitions = stateMachine.getAllowedTransitions(
        ExceptionStatus.FROZEN,
        Role.ADMIN
      );
      expect(transitions).toContain(ExceptionStatus.PENDING_REVIEW);
      expect(transitions).toContain(ExceptionStatus.APPROVED);
      expect(transitions).toContain(ExceptionStatus.REJECTED);
      expect(transitions).toContain(ExceptionStatus.CANCELLED);
    });
  });

  describe('canFreeze', () => {
    it('should allow freeze for admin on pending_review', () => {
      expect(stateMachine.canFreeze(ExceptionStatus.PENDING_REVIEW, Role.ADMIN)).toBe(true);
    });

    it('should not allow freeze for admin on frozen', () => {
      expect(stateMachine.canFreeze(ExceptionStatus.FROZEN, Role.ADMIN)).toBe(false);
    });

    it('should not allow freeze for admin on settled', () => {
      expect(stateMachine.canFreeze(ExceptionStatus.SETTLED, Role.ADMIN)).toBe(false);
    });

    it('should not allow freeze for reviewer', () => {
      expect(stateMachine.canFreeze(ExceptionStatus.PENDING_REVIEW, Role.REVIEWER)).toBe(false);
    });
  });

  describe('canUnfreeze', () => {
    it('should allow unfreeze for admin on frozen', () => {
      expect(stateMachine.canUnfreeze(ExceptionStatus.FROZEN, Role.ADMIN)).toBe(true);
    });

    it('should not allow unfreeze for admin on pending_review', () => {
      expect(stateMachine.canUnfreeze(ExceptionStatus.PENDING_REVIEW, Role.ADMIN)).toBe(false);
    });

    it('should not allow unfreeze for reviewer', () => {
      expect(stateMachine.canUnfreeze(ExceptionStatus.FROZEN, Role.REVIEWER)).toBe(false);
    });
  });

  describe('validateManualEdit', () => {
    it('should allow edit on pending_review for admin', () => {
      expect(stateMachine.validateManualEdit(ExceptionStatus.PENDING_REVIEW, Role.ADMIN)).toBe(true);
    });

    it('should allow edit on frozen for admin', () => {
      expect(stateMachine.validateManualEdit(ExceptionStatus.FROZEN, Role.ADMIN)).toBe(true);
    });

    it('should not allow edit on approved', () => {
      expect(stateMachine.validateManualEdit(ExceptionStatus.APPROVED, Role.ADMIN)).toBe(false);
    });

    it('should not allow edit for operator', () => {
      expect(stateMachine.validateManualEdit(ExceptionStatus.PENDING_REVIEW, Role.OPERATOR)).toBe(false);
    });
  });
});
