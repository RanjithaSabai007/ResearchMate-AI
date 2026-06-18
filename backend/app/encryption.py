import base64
import os
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from sqlalchemy.types import TypeDecorator, String
from app.config import ENCRYPTION_KEY

# Centralized encryption keys (using 32-byte key)
_KEY = ENCRYPTION_KEY[:32]
if len(_KEY) < 32:
    _KEY = _KEY.ljust(32, b'!')

# Static IV for Database Columns (allows query lookups like User.username == value)
_DB_IV = b"ResearchMateDBIV"

def encrypt_payload(plain_text: str) -> str:
    """Encrypt plain text network payload using AES-256-CBC with a random IV."""
    try:
        iv = os.urandom(16)
        cipher = Cipher(algorithms.AES(_KEY), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Padding
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plain_text.encode('utf-8')) + padder.finalize()
        
        # Encrypt
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        # Combine iv + ciphertext and encode as base64
        return base64.b64encode(iv + ciphertext).decode('utf-8')
    except Exception as e:
        raise ValueError(f"Encryption failed: {str(e)}")

def decrypt_payload(encrypted_base64: str) -> str:
    """Decrypt encrypted base64 network payload using AES-256-CBC with extracted IV."""
    try:
        raw_data = base64.b64decode(encrypted_base64)
        if len(raw_data) < 16:
            raise ValueError("Invalid encrypted payload length")
            
        iv = raw_data[:16]
        ciphertext = raw_data[16:]
        
        cipher = Cipher(algorithms.AES(_KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        
        # Decrypt
        padded_data = decryptor.update(ciphertext) + decryptor.finalize()
        
        # Unpad
        unpadder = padding.PKCS7(128).unpadder()
        plain_bytes = unpadder.update(padded_data) + unpadder.finalize()
        
        return plain_bytes.decode('utf-8')
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")

def encrypt_field(plain_text: str) -> str:
    """Encrypt a database field value deterministically so it is searchable."""
    if not plain_text:
        return plain_text
    try:
        cipher = Cipher(algorithms.AES(_KEY), modes.CBC(_DB_IV), backend=default_backend())
        encryptor = cipher.encryptor()
        
        # Padding
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plain_text.encode('utf-8')) + padder.finalize()
        
        # Encrypt
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        return base64.b64encode(ciphertext).decode('utf-8')
    except Exception as e:
        raise ValueError(f"DB Field encryption failed: {str(e)}")

def decrypt_field(encrypted_base64: str) -> str:
    """Decrypt a database field value deterministically."""
    if not encrypted_base64:
        return encrypted_base64
    try:
        raw_data = base64.b64decode(encrypted_base64)
        cipher = Cipher(algorithms.AES(_KEY), modes.CBC(_DB_IV), backend=default_backend())
        decryptor = cipher.decryptor()
        
        # Decrypt
        padded_data = decryptor.update(raw_data) + decryptor.finalize()
        
        # Unpad
        unpadder = padding.PKCS7(128).unpadder()
        plain_bytes = unpadder.update(padded_data) + unpadder.finalize()
        
        return plain_bytes.decode('utf-8')
    except Exception:
        # Fallback to plain text if decryption fails
        return encrypted_base64

class EncryptedString(TypeDecorator):
    """SQLAlchemy custom type for automatically encrypting database columns."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt_field(str(value))
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return decrypt_field(value)
        return value
