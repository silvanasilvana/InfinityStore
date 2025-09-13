from flask import Flask, request, jsonify
import requests
import base64

app = Flask(__name__)

CLIENT_ID = 'AUtKy_013o7nVy3PuEXuLlUf731SCb4-vvi2wH6HeWbraHzVofCBvJ-gu_jyNNEaIgF6fE8jiPpgrjk_'
SECRET = 'ELN3hJZ9cB6EFPdtN1xYQUbSElBCaTMF-P89yEDNtaVXjFWkEt6M7XQ7aHXR4_V9ZKQUNAgM2TxyfkJE'

def get_access_token():
    auth = base64.b64encode(f"{CLIENT_ID}:{SECRET}".encode()).decode()
    res = requests.post(
        'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        headers={'Authorization': f'Basic {auth}'},
        data={'grant_type':'client_credentials'}
    )
    return res.json()['access_token']

@app.route('/crear-orden', methods=['POST'])
def crear_orden():
    total = request.json['total']
    access_token = get_access_token()
    order = {
        "intent": "CAPTURE",
        "purchase_units": [{"amount": {"currency_code": "MXN", "value": str(total)}}]
    }
    res = requests.post(
        'https://api-m.sandbox.paypal.com/v2/checkout/orders',
        headers={'Authorization': f'Bearer {access_token}', 'Content-Type':'application/json'},
        json=order
    )
    return jsonify(res.json())

if __name__ == "__main__":
    app.run(port=3000)










