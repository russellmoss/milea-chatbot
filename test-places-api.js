// test-places-api.js
require('dotenv').config();
const axios = require('axios');

async function testPlacesAPI() {
  try {
    console.log('Testing Places API with:');
    console.log(`API Key: ${process.env.GOOGLE_PLACES_API_KEY.substring(0, 8)}...`);
    console.log(`Place ID: ${process.env.GOOGLE_PLACE_ID}`);
    
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${process.env.GOOGLE_PLACE_ID}&` +
      `fields=name,formatted_address&` +
      `key=${process.env.GOOGLE_PLACES_API_KEY}`
    );
    
    console.log('\nAPI Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.status === 'OK') {
      console.log('\n✅ Success! Your API key is working correctly.');
    } else {
      console.log(`\n❌ Error: ${response.data.status}`);
      console.log(response.data.error_message || 'No error message provided');
    }
  } catch (error) {
    console.error('Error testing Places API:', error.message);
  }
}

testPlacesAPI();