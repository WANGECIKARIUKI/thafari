"""Configuration file
purpose:
1. Store configuration settings.
2. Keep sensitive data from being directly accessible.
3. Configure Flask.
4. Load environment variables.
"""

# Import the operating system module.
# It allows us to read environment variables.
from datetime import timedelta
import os

# Import load_dotenv to load variables from the .env file.
from dotenv import load_dotenv


# ---------------------------------------------------------
# LOAD ENVIRONMENT VARIABLES
# ---------------------------------------------------------

# Read/load environment variables from the .env file.
load_dotenv()


# ---------------------------------------------------------
# APPLICATION CONFIGURATION
# ---------------------------------------------------------

# Create a class for configuration.
# This keeps application settings organized in one place.
class Config:

    # -----------------------------------------------------
    # SECURITY CONFIGURATION
    # -----------------------------------------------------

    # Secret key used by Flask for security-related operations.
    SECRET_KEY = os.getenv("SECRET_KEY")

    # Secret key used to sign and verify JWT tokens.
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    # Access tokens are intentionally short-lived.
    # If an access token is stolen, its useful lifetime is limited.

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)

    # Refresh tokens live longer and are used to obtain new access tokens without requiring the user to log in again.
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

   # Explicitly tell Flask-JWT-Extended to look for access tokens in the Authorization header.
    JWT_TOKEN_LOCATION = ["headers"]

    # Secret used by our application for webhook verification.
    # This can remain for now if other parts of the project
    # still reference it.
    WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET")


    # -----------------------------------------------------
    # PESAPAL CONFIGURATION
    # -----------------------------------------------------

    # Pesapal API credentials.
    PESAPAL_CONSUMER_KEY = os.getenv("PESAPAL_CONSUMER_KEY")
    PESAPAL_CONSUMER_SECRET = os.getenv("PESAPAL_CONSUMER_SECRET")

    # Pesapal API environment URL.
    PESAPAL_BASE_URL = os.getenv("PESAPAL_BASE_URL")

    # URL Pesapal uses to send payment notifications to Thafari.
    PESAPAL_IPN_URL = os.getenv("PESAPAL_IPN_URL")

    # URL Pesapal redirects the customer to after checkout.
    PESAPAL_CALLBACK_URL = os.getenv("PESAPAL_CALLBACK_URL")

    # ID returned when we registered our IPN with Pesapal.
    PESAPAL_IPN_ID = os.getenv("PESAPAL_IPN_ID")


    # -----------------------------------------------------
    # EMAIL CONFIGURATION
    # -----------------------------------------------------

    # SMTP server used to send emails.
    # For Gmail this will normally be smtp.gmail.com.
    MAIL_SERVER = os.getenv("MAIL_SERVER")

    # SMTP port.
    # 587 is commonly used with TLS.
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))

    # Enable TLS encryption for the email connection.
    MAIL_USE_TLS = (
        os.getenv("MAIL_USE_TLS", "True").lower() == "true"
    )

    # Email account Thafari will use to send emails.
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")

    # Password/app password for the email account.
    # The actual password stays inside .env.
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")

    # Email address customers will see as the sender.
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")

    # -----------------------------------------------------
    # WHATSAPP CONFIGURATION
    # -----------------------------------------------------

    WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN")
    WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION")


    # -----------------------------------------------------
    # DATABASE CONFIGURATION
    # -----------------------------------------------------

    DB_HOST = os.getenv("DB_HOST")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_PORT = os.getenv("DB_PORT")


    # -----------------------------------------------------
    # SQLALCHEMY CONFIGURATION
    # -----------------------------------------------------

    # Build the SQLAlchemy connection string.
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@"
        f"{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )

    # Disable SQLAlchemy modification tracking.
    # This reduces unnecessary overhead and improves performance.
    SQLALCHEMY_TRACK_MODIFICATIONS = False