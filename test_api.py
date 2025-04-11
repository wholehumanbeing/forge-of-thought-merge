import requests
import json

print("Testing Forge of Thought API...")

# Test root endpoint first
try:
    root_response = requests.get("http://localhost:8000")
    print(f"Root endpoint status: {root_response.status_code}")
    print(f"Root response: {root_response.text}")
except Exception as e:
    print(f"Error calling root endpoint: {e}")

# Use the correct URL format with hyphens
correct_url = "http://localhost:8000/api/v1/onboarding/select-archetype"

# Test data
payload = {"archetype_id": "synthesist"}

# Test the correct URL
print(f"\nTesting correct URL: {correct_url}")
try:
    response = requests.post(correct_url, json=payload)
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Response data:")
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Exception occurred: {e}")

# Lastly, get available routes from the OpenAPI schema
try:
    openapi_response = requests.get("http://localhost:8000/openapi.json")
    if openapi_response.status_code == 200:
        openapi_data = openapi_response.json()
        print("\nAvailable paths from OpenAPI schema:")
        for path in openapi_data.get("paths", {}).keys():
            print(f"  {path}")
    else:
        print(f"Failed to get OpenAPI schema: {openapi_response.status_code}")
except Exception as e:
    print(f"Error getting OpenAPI schema: {e}") 