import pandas as pd
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

CSV_FILE = 'Data_Final.csv' 

try:
    # Membaca CSV
    data_df = pd.read_csv(CSV_FILE)
    print(f"✅ File '{CSV_FILE}' berhasil dimuat.")
except FileNotFoundError:
    print(f"❌ ERROR: File '{CSV_FILE}' tidak ditemukan!")
    data_df = pd.DataFrame()

@app.route('/api/customers', methods=['GET'])
def get_customers():
    if data_df.empty:
        return jsonify([]), 200
    
    # Mengambil 15000 data random untuk Testing
    sample_size = 15000
    
    if len(data_df) > sample_size:
        df_sample = data_df.sample(n=sample_size, random_state=42).fillna('')
    else:
        df_sample = data_df.fillna('')
    customers_json = df_sample.to_dict(orient='records')
    return jsonify(customers_json)
if __name__ == '__main__':
    app.run(debug=True, port=5000)