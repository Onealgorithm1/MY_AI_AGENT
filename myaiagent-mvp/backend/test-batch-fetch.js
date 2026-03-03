import axios from 'axios';

async function testBatchFetch() {
    console.log('Testing batchFetchAll endpoint...');
    try {
        const res = await axios.post('http://localhost:3000/api/sam-gov/batch-fetch-all', {}, {
            headers: {
                // Using a dummy auth token or assuming the route might fail auth, 
                // but we'll see if the route is reachable. We'll use the browser or login if it needs auth.
                // Actually, let's write a direct service test instead since auth is required.
            }
        });
        console.log(res.data);
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}

testBatchFetch();
