declare global {
  namespace Express {
    interface Request {
      traceId: string;
      operator: {
        id: string;
        name: string;
      };
    }
  }
}

export {};
