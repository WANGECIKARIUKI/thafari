from models.base_model import BaseModel
from extensions import db


class RevenueTarget(BaseModel):
    __tablename__ = "revenue_targets"

    target_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False
    )

    start_date = db.Column(
        db.Date,
        nullable=False
    )

    end_date = db.Column(
        db.Date,
        nullable=False
    )

    __table_args__ = (
        db.CheckConstraint(
            "target_amount > 0",
            name="check_positive_target_amount"
        ),
        db.CheckConstraint(
            "end_date >= start_date",
            name="check_valid_target_period"
        ),
    )
