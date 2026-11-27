"""Automatically resume builds stopped by the previous transient-provider message."""
from alembic import op

revision = "20261127_resume_legacy"
down_revision = "20261127_durable_build_retries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This exact public message was only emitted for retryable provider
    # transport/availability failures. Preserve completed steps and retry the
    # current step once under the new durable scheduler.
    op.execute("""
        UPDATE build_tasks
        SET status = 'waiting',
            retry_count = 0,
            next_retry_at = now() + interval '2 minutes',
            last_error = 'A temporary AI service issue interrupted this step. Your completed work is saved; ibrant will automatically retry it.',
            finished_at = NULL,
            updated_at = now(),
            events = COALESCE(events, '[]'::jsonb) || jsonb_build_array(
                jsonb_build_object(
                    'at', now()::text,
                    'type', 'task_auto_requeued',
                    'level', 'warning',
                    'message', 'ibrant safely re-queued this unfinished step after the retry system was upgraded.',
                    'step_index', current_step_index
                )
            )
        WHERE status = 'failed'
          AND last_error = 'IBRANT could not complete this step right now. Your completed steps are saved; retry this step later.'
          AND current_step_index < jsonb_array_length(COALESCE(plan->'steps', '[]'::jsonb))
    """)


def downgrade() -> None:
    # Do not roll back task state: a retry may already have started or completed.
    pass
