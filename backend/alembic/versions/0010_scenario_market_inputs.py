"""scenario market inputs

Revision ID: 0010_scenario_market_inputs
Revises: 0009_annual_plans
Create Date: 2026-02-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0010_scenario_market_inputs"
down_revision = "0009_annual_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scenarios", sa.Column("usd_kzt", sa.Float(), nullable=False, server_default="507"))
    op.add_column("scenarios", sa.Column("oil_price_kz", sa.Float(), nullable=False, server_default="70"))
    op.add_column("scenarios", sa.Column("brent_price", sa.Float(), nullable=False, server_default="75"))
    op.add_column("scenarios", sa.Column("kzt_inflation", sa.Float(), nullable=False, server_default="8"))


def downgrade() -> None:
    op.drop_column("scenarios", "kzt_inflation")
    op.drop_column("scenarios", "brent_price")
    op.drop_column("scenarios", "oil_price_kz")
    op.drop_column("scenarios", "usd_kzt")
