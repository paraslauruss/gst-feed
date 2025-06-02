export const loader = () => {
  return json({
    status: "success",
    message: "API test endpoint is working!",
    timestamp: new Date().toISOString()
  });
};

// Optional: Add a basic component for browser view
export default function TestEndpoint() {
  return (
    <div style={{ padding: 20, fontFamily: 'system-ui' }}>
      <h1>API Test Endpoint</h1>
      <p>This is a test endpoint for API routes</p>
    </div>
  );
}