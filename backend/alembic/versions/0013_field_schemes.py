"""field schemes and objects

Revision ID: 0013_field_schemes
Revises: 0012_crisis_response
Create Date: 2026-02-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0013_field_schemes"
down_revision = "0012_crisis_response"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "field_object_types",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(length=50), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=True),
        sa.Column("icon_name", sa.String(length=100), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("default_properties", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "field_schemes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("oil_field_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_baseline", sa.Boolean(), nullable=False),
        sa.Column("canvas_width", sa.Integer(), nullable=False),
        sa.Column("canvas_height", sa.Integer(), nullable=False),
        sa.Column("zoom_level", sa.Float(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("parent_scheme_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["oil_field_id"], ["oil_fields.id"], name="fk_field_schemes_oil_field_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_scheme_id"], ["field_schemes.id"], name="fk_field_schemes_parent_id"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name="fk_field_schemes_created_by"),
    )
    op.create_index("idx_scheme_field", "field_schemes", ["oil_field_id"])

    op.create_table(
        "field_scheme_objects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scheme_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("object_type_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("object_code", sa.String(length=100), nullable=False),
        sa.Column("object_name", sa.String(length=255), nullable=True),
        sa.Column("position_x", sa.Integer(), nullable=False),
        sa.Column("position_y", sa.Integer(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False),
        sa.Column("height", sa.Integer(), nullable=False),
        sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("icon_override", sa.String(length=100), nullable=True),
        sa.Column("rotation", sa.Integer(), nullable=False),
        sa.Column("linked_asset_type", sa.String(length=50), nullable=True),
        sa.Column("linked_asset_id", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["scheme_id"], ["field_schemes.id"], name="fk_scheme_objects_scheme_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["object_type_id"], ["field_object_types.id"], name="fk_scheme_objects_type_id"),
        sa.UniqueConstraint("scheme_id", "object_code", name="uq_scheme_object_code"),
    )
    op.create_index("idx_object_scheme", "field_scheme_objects", ["scheme_id"])
    op.create_index("idx_object_type", "field_scheme_objects", ["object_type_id"])

    op.create_table(
        "field_scheme_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scheme_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_object_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_object_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("connection_type", sa.String(length=50), nullable=False),
        sa.Column("flow_properties", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("color", sa.String(length=20), nullable=True),
        sa.Column("line_style", sa.String(length=50), nullable=False),
        sa.Column("line_width", sa.Integer(), nullable=False),
        sa.Column("animated", sa.Boolean(), nullable=False),
        sa.Column("path_points", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["scheme_id"], ["field_schemes.id"], name="fk_scheme_connections_scheme_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_object_id"], ["field_scheme_objects.id"], name="fk_scheme_connections_source_id", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_object_id"], ["field_scheme_objects.id"], name="fk_scheme_connections_target_id", ondelete="CASCADE"),
    )
    op.create_index("idx_connection_scheme", "field_scheme_connections", ["scheme_id"])
    op.create_index("idx_connection_source", "field_scheme_connections", ["source_object_id"])
    op.create_index("idx_connection_target", "field_scheme_connections", ["target_object_id"])

    op.create_table(
        "field_scheme_calculations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("scheme_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("calculation_run_at", sa.DateTime(), nullable=False),
        sa.Column("calculation_type", sa.String(length=50), nullable=False),
        sa.Column("input_parameters", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("results", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("validation_status", sa.String(length=50), nullable=True),
        sa.Column("validation_messages", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("execution_time_ms", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["scheme_id"], ["field_schemes.id"], name="fk_scheme_calculations_scheme_id", ondelete="CASCADE"),
    )
    op.create_index("idx_calc_scheme", "field_scheme_calculations", ["scheme_id"])


def downgrade() -> None:
    op.drop_index("idx_calc_scheme", table_name="field_scheme_calculations")
    op.drop_table("field_scheme_calculations")
    op.drop_index("idx_connection_target", table_name="field_scheme_connections")
    op.drop_index("idx_connection_source", table_name="field_scheme_connections")
    op.drop_index("idx_connection_scheme", table_name="field_scheme_connections")
    op.drop_table("field_scheme_connections")
    op.drop_index("idx_object_type", table_name="field_scheme_objects")
    op.drop_index("idx_object_scheme", table_name="field_scheme_objects")
    op.drop_table("field_scheme_objects")
    op.drop_index("idx_scheme_field", table_name="field_schemes")
    op.drop_table("field_schemes")
    op.drop_table("field_object_types")
