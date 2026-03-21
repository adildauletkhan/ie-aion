"""Add NGDU table, ngdu_id on oil_fields, user_workspaces

Revision ID: 0015_ngdu_workspaces
Revises: 0014_reservoir_twin
Create Date: 2026-02-24
"""

from alembic import op
import sqlalchemy as sa

revision = "0015_ngdu_workspaces"
down_revision = "0014_reservoir_twin"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- workspace_scope on extraction_companies ---
    op.add_column(
        "extraction_companies",
        sa.Column("workspace_scope", sa.String(20), nullable=False, server_default="own"),
    )

    # --- NGDU (Нефтегазодобывающее управление) ---
    op.create_table(
        "ngdus",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("short_name", sa.String(100), nullable=True),
        sa.Column("region", sa.String(100), nullable=True),
        sa.Column("status", sa.String(50), nullable=True, default="active"),
        sa.Column(
            "extraction_company_id",
            sa.Integer(),
            sa.ForeignKey("extraction_companies.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # --- ngdu_id on oil_fields ---
    op.add_column(
        "oil_fields",
        sa.Column(
            "ngdu_id",
            sa.Integer(),
            sa.ForeignKey("ngdus.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # --- user_workspaces (which extraction companies a user can access) ---
    op.create_table(
        "user_workspaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "extraction_company_id",
            sa.Integer(),
            sa.ForeignKey("extraction_companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("is_default", sa.Boolean(), nullable=False, default=False),
    )
    op.create_unique_constraint(
        "uq_user_workspace", "user_workspaces", ["user_id", "extraction_company_id"]
    )

    # --- active_workspace_id on users (last selected workspace) ---
    op.add_column(
        "users",
        sa.Column(
            "active_workspace_id",
            sa.Integer(),
            sa.ForeignKey("extraction_companies.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "active_workspace_id")
    op.drop_table("user_workspaces")
    op.drop_column("oil_fields", "ngdu_id")
    op.drop_table("ngdus")
    op.drop_column("extraction_companies", "workspace_scope")
