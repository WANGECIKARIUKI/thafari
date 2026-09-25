import requests

from flask import current_app


def send_whatsapp_message(phone_number, message):
    """
    Send a WhatsApp text message through the configured
    WhatsApp provider.

    The actual API credentials and endpoint are loaded
    from Flask configuration/environment variables.
    """

    # Get WhatsApp configuration from Flask config.
    access_token = current_app.config["WHATSAPP_ACCESS_TOKEN"]
    phone_number_id = current_app.config["WHATSAPP_PHONE_NUMBER_ID"]
    api_version = current_app.config["WHATSAPP_API_VERSION"]

    # Build the WhatsApp Cloud API endpoint.
    url = (
        f"https://graph.facebook.com/"
        f"{api_version}/"
        f"{phone_number_id}/messages"
    )

    # Authentication and content headers.
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # WhatsApp message payload.
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "text",
        "text": {
            "body": message
        }
    }

    # Send the request to WhatsApp.
    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=15
    )

    # Raise an exception if WhatsApp rejects the request.
    response.raise_for_status()

    return response.json()