# =========================================================
# THAFARI CONTACT MODEL
# =========================================================
#
# This model stores the contact details displayed on the
# public Thafari website.
#
# Admins can update these details without changing the
# frontend code.
#
# Stored contact details:
#
# - WhatsApp
# - Email
# - Phone number
#
# Thafari uses one default contact record.
# =========================================================

from extensions import db

from models.base_model import BaseModel


class Contact(BaseModel):
    """
    Store the default Thafari contact details.
    """

    __tablename__ = "contacts"

    # WHATSAPP
    whatsapp = db.Column(
        db.String(30),
        nullable=False
    )

    # EMAIL
    email = db.Column(
        db.String(150),
        nullable=False
    )

    # PHONE NUMBER
    phone_number = db.Column(
        db.String(30),
        nullable=False
    )
