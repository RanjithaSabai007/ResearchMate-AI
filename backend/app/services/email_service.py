import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL
)

def send_password_reset_email(to_email: str, username: str, otp: str) -> bool:
    """
    Sends a password reset OTP code email via SMTP.
    Returns True if successfully sent, otherwise False.
    """
    if not SMTP_HOST:
        print("[WARNING] SMTP_HOST is not configured. Email dispatch skipped. OTP Code:", otp)
        return False
        
    subject = "ResearchMate AI - Password Reset Request"
    body = f"""Hi {username},

We received a request to reset the password for your ResearchMate AI account.
Your password reset OTP code is:

{otp}

This code is valid for 15 minutes. If you did not request a password reset, please ignore this email.

Best regards,
ResearchMate AI Team
"""

    msg = MIMEMultipart()
    # Fallback to SMTP_USERNAME if SMTP_FROM_EMAIL is empty
    sender = SMTP_FROM_EMAIL or SMTP_USERNAME
    msg['From'] = sender
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        port = int(SMTP_PORT or 587)
        print(f"[INFO] Connecting to SMTP server {SMTP_HOST}:{port}...")
        
        # Connect depending on port
        if port == 465:
            server = smtplib.SMTP_SSL(SMTP_HOST, port, timeout=10)
        else:
            server = smtplib.SMTP(SMTP_HOST, port, timeout=10)
            server.starttls()
            
        # Login if username and password are provided
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            
        server.sendmail(sender, to_email, msg.as_string())
        server.close()
        print(f"[INFO] Password reset email successfully dispatched to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email via SMTP to {to_email}: {e}")
        return False
