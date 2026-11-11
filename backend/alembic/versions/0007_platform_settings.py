"""platform_settings table

Revision ID: 0007_platform_settings
Revises: 0006_profile
Create Date: 2026-11-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0007_platform_settings"
down_revision: Union[str, None] = "0006_profile"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "platform_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_platform_settings"),
        sa.UniqueConstraint("key", name="uq_platform_settings_key"),
    )
    # Seed default keys
    op.execute("""
        INSERT INTO platform_settings (key, value, description) VALUES
        ('site_name', 'ZORVI', 'Brand name shown on the site'),
        ('site_tagline', 'Learn. Create. Launch.', 'Brand tagline'),
        ('support_email', 'support@zorvi.com', 'Contact email shown to users'),
        ('support_phone', '', 'Optional phone number'),
        ('payment_bank_name', '', 'Bank name for manual bank transfer payments'),
        ('payment_bank_account', '', 'Bank account number'),
        ('payment_bank_holder', '', 'Account holder name'),
        ('payment_paypal', '', 'PayPal email for manual payments'),
        ('payment_wise', '', 'Wise account email'),
        ('terms_url', '', 'Link to Terms of Service page'),
        ('privacy_url', '', 'Link to Privacy Policy page');
    """)


def downgrade() -> None:
    op.drop_table("platform_settings")
