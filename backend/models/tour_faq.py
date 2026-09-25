# =========================================================
# THAFARI TOUR FAQ MODEL
# =========================================================
#
# This model stores frequently asked questions and answers
# for a safari package.
#
# One Tour can have many FAQs.
#
# Example:
#
# Tour: Diani Safari
#
# Question:
# "What is included in the safari?"
#
# Answer:
# "The package includes transport, accommodation..."
#
# =========================================================

from extensions import db

from models.base_model import BaseModel


class TourFAQ(BaseModel):

    __tablename__ = "tour_faqs"

    # -----------------------------------------------------
    # The safari package this FAQ belongs to
    # -----------------------------------------------------

    tour_id = db.Column(
        db.Integer,
        db.ForeignKey("tours.id"),
        nullable=False
    )

    # -----------------------------------------------------
    # The frequently asked question
    # -----------------------------------------------------

    question = db.Column(
        db.String(500),
        nullable=False
    )

    # -----------------------------------------------------
    # The answer to the question
    # -----------------------------------------------------

    answer = db.Column(
        db.Text,
        nullable=False
    )

    # -----------------------------------------------------
    # Relationship back to the Tour
    # -----------------------------------------------------

    tour = db.relationship(
        "Tour",
        back_populates="faqs"
    )