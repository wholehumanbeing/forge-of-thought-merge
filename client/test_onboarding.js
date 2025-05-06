// Quick test script to check if the onboarding API is working
// Run with: node test_onboarding.js

const axios = require('axios');

const API_URL = 'http://localhost:8000/api/v1';

async function testOnboardingAPI() {
  try {
    // Test health endpoint first
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL.split('/api/v1')[0]}/health`);
    console.log('Health response:', healthResponse.data);
    
    // Test selecting an archetype
    console.log('\nTesting archetype selection...');
    const archetype = 'synthesist';
    const response = await axios.post(`${API_URL}/onboarding/select-archetype`, {
      archetype_id: archetype
    });
    
    console.log('Archetype selection successful!');
    console.log(`Received ${response.data.length} seed nodes for archetype '${archetype}'`);
    console.log('First node:', response.data[0]);
    
    return response.data;
  } catch (error) {
    console.error('Error testing onboarding API:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request error - no response received');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testOnboardingAPI()
  .then(() => console.log('Test completed'))
  .catch(err => console.error('Unhandled error:', err)); 