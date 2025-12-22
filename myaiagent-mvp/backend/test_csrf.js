import axios from 'axios';

const BASE_URL = 'http://localhost:5000'; // User reported 5000

async function testCsrf() {
    try {
        console.log(`1. Fetching CSRF token from ${BASE_URL}/api/csrf-token...`);
        const resp1 = await axios.get(`${BASE_URL}/api/csrf-token`, {
            withCredentials: true // axios node handles cookies with 'jar' if configured, but by default it doesn't persist cookies between requests unless we use a cookie jar or manually handle headers.
        });

        // In Node, we must manually extract and send cookies
        const cookies = resp1.headers['set-cookie'];
        if (!cookies) {
            console.error('❌ No Set-Cookie header received!');
            return;
        }

        const csrfToken = resp1.data.csrfToken;
        console.log('✅ Received Token:', csrfToken);
        console.log('✅ Received Cookies:', cookies);

        console.log('\n2. Attempting POST to /api/messages with token...');

        try {
            // We'll just test the CSRF check, so even a 401 (Unauthorized) is "success" for CSRF check.
            // A 403 Invalid CSRF Token is failure.
            const resp2 = await axios.post(`${BASE_URL}/api/messages`, {
                content: "test",
                model: "test"
            }, {
                headers: {
                    'x-csrf-token': csrfToken,
                    'Cookie': cookies.join('; ')
                },
                withCredentials: true
            });
            console.log('✅ POST succeeded with status:', resp2.status);
        } catch (err) {
            if (err.response) {
                console.log(`ℹ️ POST returned status: ${err.response.status}`);
                console.log(`ℹ️ Response data:`, err.response.data);

                if (err.response.status === 403 && (err.response.data.error === 'invalid csrf token' || err.response.data.message === 'invalid csrf token')) {
                    console.error('❌ CSRF Validation FAILED!');
                } else if (err.response.status === 401) {
                    console.log('✅ CSRF Validation Passed (Request rejected due to Auth, which is expected/ignored for this test)');
                } else {
                    console.log(`⚠️ Unexpected status: ${err.response.status}`);
                }
            } else {
                console.error('❌ Request error:', err.message);
            }
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error(`❌ Could not connect to ${BASE_URL}. Is server running?`);
        } else {
            console.error('❌ Error during test:', error.message);
        }
    }
}

testCsrf();
