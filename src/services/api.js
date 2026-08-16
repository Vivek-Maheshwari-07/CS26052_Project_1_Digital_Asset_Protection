/**
 * Mock API Service layer for backend communication
 */

export const mockDelay = (ms = 600) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const apiRequest = async (endpoint, options = {}) => {
  await mockDelay(500);
  return {
    status: 200,
    ok: true,
    data: { message: `Request to ${endpoint} successful` }
  };
};

export default apiRequest;
