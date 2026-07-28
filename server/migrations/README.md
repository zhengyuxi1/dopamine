# Database migrations

The main checkout's `server/shop.db` is the formal production database. Each
VibeCoding worktree has its own tracked copy, which is only the source for that
user's isolated preview snapshot. A publish must never merge the worktree's
binary database over the main database.

Every database change triggered by the VibeCoding agent, whether schema or
data and whether or not the user explicitly mentions publishing, must be a new
numbered SQL file:

```text
001_add_product_status.sql
002_update_homepage_products.sql
```

Never edit an already-applied migration. Migrations should remain compatible
with the currently running server during a blue/green deployment. CC Entry owns
the migration executor: it verifies checksums, creates the production backup,
and applies the entire pending set in one transaction.
Migration files must not contain their own `BEGIN`, `COMMIT`, `ROLLBACK`,
`VACUUM`, or other statements that cannot run inside that transaction.

The agent must not directly mutate any baseline, preview, or production
database, including through `sqlite3` in Bash. After adding a migration, call
`DeployPreview` with `target: "server"` so CC Entry can apply it to a fresh
isolated preview database before the change is reported as complete.
