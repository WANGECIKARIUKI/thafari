# =========================================================
# THAFARI TOUR MODEL
# =========================================================
#
# This model represents a safari package on Thafari.
#
# A Tour can have:
#
# - Many departures
# - Many itinerary entries
# - Many accommodation options
# - Many FAQs
# - One cover image
# - Multiple gallery images
#
# =========================================================


from extensions import db

from models.base_model import BaseModel


class Tour(BaseModel):

    __tablename__ = "tours"


    # =====================================================
    # BASIC SAFARI INFORMATION
    # =====================================================

    tour_name = db.Column(
        db.String(100),
        nullable=False
    )


    destination = db.Column(
        db.String(200),
        nullable=False
    )


    # =====================================================
    # SAFARI PACKAGE DESCRIPTION
    # =====================================================
    #
    # This is the main "About this Safari" information
    # customers will see on the package page.
    #
    # =====================================================

    description = db.Column(
        db.Text,
        nullable=True
    )


    # =====================================================
    # SAFARI DURATION
    # =====================================================

    duration_days = db.Column(
        db.Integer,
        nullable=True
    )


    duration_nights = db.Column(
        db.Integer,
        nullable=True
    )


    # =====================================================
    # TOUR IMAGES
    # =====================================================
    #
    # cover_image:
    #
    # The main image displayed at the top of the safari
    # details page.
    #
    # Example:
    #
    # https://example.com/maasai-mara.jpg
    #
    # gallery_images:
    #
    # A list of additional image URLs.
    #
    # MySQL JSON allows us to store a list such as:
    #
    # [
    #     "https://example.com/image1.jpg",
    #     "https://example.com/image2.jpg",
    #     "https://example.com/image3.jpg"
    # ]
    #
    # We are storing URLs rather than image files because
    # the actual images should eventually live in proper
    # image/object storage.
    #
    # =====================================================

    cover_image = db.Column(
        db.String(500),
        nullable=True
    )


    gallery_images = db.Column(
        db.JSON,
        nullable=True
    )


    # =====================================================
    # TOUR OPERATOR
    # =====================================================

    tour_operator_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )


    # Existing field.
    #
    # We keep this because it already exists in the
    # database and may still be used elsewhere.
    #

    charges = db.Column(
        db.Numeric(10, 2),
        nullable=True
    )


    # =====================================================
    # ACTIVE STATUS
    # =====================================================

    is_active = db.Column(
        db.Boolean,
        default=True
    )


    # =====================================================
    # RELATIONSHIP WITH TOUR OPERATOR
    # =====================================================

    operator = db.relationship(
        "User",
        back_populates="tours"
    )


    # =====================================================
    # RELATIONSHIP WITH DEPARTURES
    # =====================================================

    departures = db.relationship(
        "Departure",
        back_populates="tour",
        lazy=True
    )


    # =====================================================
    # RELATIONSHIP WITH ITINERARIES
    # =====================================================

    itineraries = db.relationship(
        "TourItinerary",
        back_populates="tour",
        cascade="all, delete-orphan",
        order_by="TourItinerary.day_number"
    )


    # =====================================================
    # RELATIONSHIP WITH ACCOMMODATIONS
    # =====================================================

    accommodations = db.relationship(
        "TourAccommodation",
        back_populates="tour",
        cascade="all, delete-orphan"
    )


    # =====================================================
    # RELATIONSHIP WITH FAQs
    # =====================================================

    faqs = db.relationship(
        "TourFAQ",
        back_populates="tour",
        cascade="all, delete-orphan"
    )