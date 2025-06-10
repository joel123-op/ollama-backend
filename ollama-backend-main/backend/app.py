import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_community.llms import Ollama
import firebase_admin
from firebase_admin import credentials, auth, firestore

# Initialize Flask
app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Ollama + Chroma with TinyLlama for better performance
EMBEDDINGS = OllamaEmbeddings(model="tinyllama")
CHROMA_DB_DIR = "chroma_db"
os.makedirs(CHROMA_DB_DIR, exist_ok=True)
vectordb = Chroma(persist_directory=CHROMA_DB_DIR, embedding_function=EMBEDDINGS)

# Firebase Admin
FIREBASE_CREDENTIALS_PATH = "serviceAccountKey.json"
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)
db = firestore.client()

def verify_token(id_token):
    try:
        decoded = auth.verify_id_token(id_token)
        return decoded['uid']
    except Exception:
        return None

@app.route('/api/upload', methods=['POST'])
def upload_file():
    id_token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    uid = verify_token(id_token)
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    loader = PyPDFLoader(filepath) if filename.lower().endswith('.pdf') else TextLoader(filepath)
    documents = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=30)
    docs = splitter.split_documents(documents)
    vectordb.add_documents(docs)

    file_record = {'uid': uid, 'filename': filename}
    doc_ref = db.collection('uploads').document()
    doc_ref.set(file_record)

    return jsonify({'message': 'File uploaded and processed'}), 200

@app.route('/api/ask', methods=['POST'])
def ask():
    id_token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    uid = verify_token(id_token)
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    question = request.json.get('question', '')
    if not question:
        return jsonify({'error': 'No question provided'}), 400

    llm = Ollama(model="tinyllama")
    qa = RetrievalQA.from_chain_type(llm=llm, retriever=vectordb.as_retriever())
    answer = qa.run(question)

    history_ref = db.collection('history').document()
    history_ref.set({'uid': uid, 'question': question, 'answer': answer})

    return jsonify({'answer': answer}), 200

@app.route('/api/files', methods=['GET'])
def list_files():
    id_token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    uid = verify_token(id_token)
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    docs = db.collection('uploads').where('uid', '==', uid).stream()
    files = [doc.to_dict().get('filename', '') for doc in docs]
    return jsonify({'files': files}), 200

@app.route('/api/history', methods=['GET'])
def get_history():
    id_token = request.headers.get('Authorization', '').split('Bearer ')[-1]
    uid = verify_token(id_token)
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    docs = db.collection('history').where('uid', '==', uid).stream()
    history = [{'question': d.to_dict().get('question', ''), 'answer': d.to_dict().get('answer', '')} for d in docs]
    return jsonify({'history': history}), 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True)
