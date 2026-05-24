module.exports = async () => {
  if ((global as any).__DATA_SOURCE__) {
    await (global as any).__DATA_SOURCE__.destroy();
  }
};
