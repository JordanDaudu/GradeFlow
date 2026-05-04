# GradeFlow Backup and Restore

GradeFlow stores important data in two places:

1. **PostgreSQL database**
   - users
   - courses
   - students
   - enrollments
   - assignments
   - submissions
   - grades
   - feedback/rubric metadata

2. **MinIO / S3-compatible object storage**
   - uploaded assignment files
   - uploaded submission files
   - PDFs / DOCX files / related uploaded documents

A complete backup should include **both** PostgreSQL and MinIO.

---

## Full Backup

The recommended backup command is:

```bash
./scripts/backup-all.sh
```

This creates a timestamped full backup under:

```text
backups/
```

Example output:

```text
backups/gradeflow-full-2026-05-04_18-47-58.tar.gz
backups/gradeflow-full-2026-05-04_18-47-58/
  database.sql
  minio.tar.gz
  manifest.txt
```

The full backup contains:

```text
database.sql   PostgreSQL database dump
minio.tar.gz   MinIO uploaded file storage archive
manifest.txt   backup information
```

During the backup, the script temporarily stops the backend and frontend to prevent new writes while the database and object storage are being copied.

After backup finishes, the app services are started again automatically.

---

## Full Restore

To restore a full backup:

```bash
./scripts/restore-all.sh backups/gradeflow-full-YYYY-MM-DD_HH-MM-SS.tar.gz
```

Example:

```bash
./scripts/restore-all.sh backups/gradeflow-full-2026-05-04_18-47-58.tar.gz
```

The script will ask for confirmation.

Type:

```text
RESTORE
```

The restore replaces:

```text
PostgreSQL database data
MinIO uploaded files
```

After restore finishes, the full Docker stack is started again.

Verify the app:

```bash
docker compose ps
curl http://localhost:3000/api/healthz
```

Expected health response:

```json
{"status":"ok"}
```

---

## Database-Only Backup

To backup only PostgreSQL:

```bash
./scripts/backup-db.sh
```

This creates a `.sql` backup in:

```text
backups/
```

You can also override the output file:

```bash
BACKUP_FILE=backups/database.sql ./scripts/backup-db.sh
```

---

## Database-Only Restore

To restore only PostgreSQL:

```bash
./scripts/restore-db.sh backups/database.sql
```

The script asks for confirmation before replacing database data.

---

## MinIO-Only Backup

To backup only uploaded files from MinIO:

```bash
./scripts/backup-minio.sh
```

This creates a `.tar.gz` archive in:

```text
backups/
```

You can also override the output file:

```bash
BACKUP_FILE=backups/minio.tar.gz ./scripts/backup-minio.sh
```

---

## MinIO-Only Restore

To restore only MinIO uploaded files:

```bash
./scripts/restore-minio.sh backups/minio.tar.gz
```

The script asks for confirmation before replacing the current MinIO files.

---

## Important Notes

- `backups/` is ignored by Git and should not be committed.
- `.env` is ignored by Git and should not be committed.
- A database-only backup is not enough if the app has uploaded files.
- A MinIO-only backup is not enough because the database contains the file metadata.
- For the safest recovery point, use `./scripts/backup-all.sh`.
- Restore is destructive. Only restore when you are sure the backup is the one you want.

---

## Future Remote Storage Note

These scripts are designed for the local Docker setup with bundled PostgreSQL and MinIO.

If GradeFlow later uses:

```text
Remote PostgreSQL
Remote S3-compatible storage
```

then backup scripts should be extended to support remote database URLs and remote object storage sync/mirror commands.
