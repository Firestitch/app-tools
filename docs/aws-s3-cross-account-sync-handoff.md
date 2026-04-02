# S3 cross-account sync — partner handoff playbook

**Roles**

| Party | AWS account | Role in this project |
|-------|-------------|----------------------|
| **Source** (your organization) | Account **A** | Owns data; runs incremental sync (CLI) **into** destination. |
| **Destination** (partner) | Account **B** | Owns receiving bucket; grants write access to Source’s principal; documents and tests. |

**Goal:** Incremental, rsync-style sync from Source’s S3 prefix to Destination’s S3 prefix, repeatable on demand (e.g. today, next week, next month) using **`aws s3 sync`**.

---

## Part 1 — Instructions for Destination (Account B)

Complete these steps, **document everything** (copy finalized JSON and ARNs into the deliverable template in Part 3), then **test** before sending instructions back to Source.

### 1.1 Prerequisites (B)

- [ ] S3 bucket in **B** for received data (note name, region, optional prefix e.g. `incoming/crm/`).
- [ ] Versioning / encryption / Object Lock requirements decided and applied if required.
- [ ] **Source account ID** for Account **A** (12-digit): `________________`

### 1.2 Define Source writer identity (A)

Source will run the CLI using **one** of these (B must know which Source chose):

- **Option 1 — IAM user or role in A** (recommended for automation): Source supplies the **ARN** of that user or role after B sends bucket policy requirements.
- **Option 2 — Role in B assumed by A**: B creates a role; A’s admins configure `sts:AssumeRole` from A into that role; sync uses credentials for that assumed role.

**Default assumption below:** Source uses an **IAM role in A** with ARN:

`arn:aws:iam::<ACCOUNT_A_ID>:role/<SOURCE_SYNC_ROLE_NAME>`

Replace placeholders when pasting policies.

### 1.3 Bucket policy on Destination bucket (B) — required

Attach to **B’s destination bucket** so Source’s principal can **write** (and list for multipart/sync). Adjust bucket name and Source principal ARN.

**Recommended first version** (works reliably with `aws s3 sync`; scope access by using a **dedicated bucket** or a **dedicated prefix** in the sync command only):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSourceSyncWriteAndList",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_A_ID:role/SOURCE_SYNC_ROLE_NAME"
      },
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts",
        "s3:ListBucketMultipartUploads",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::DEST_BUCKET_NAME",
        "arn:aws:s3:::DEST_BUCKET_NAME/*"
      ]
    }
  ]
}
```

- Include **`s3:PutObjectAcl`** only if Source must set canned ACLs/object ownership; many setups omit it and use bucket-owner-enforced Object Ownership instead.
- **Tighten later:** add `Condition` with `StringLike` + `s3:prefix` on **ListBucket** only; for **object** actions, prefer a **dedicated prefix** and narrow `Resource` to `arn:aws:s3:::DEST_BUCKET_NAME/allowed-prefix/*` after testing.
- If buckets use **SSE-KMS** in B, add **KMS key policy** allowing the same principal to `kms:Encrypt`, `kms:GenerateDataKey`, `kms:DescribeKey` on that key.
- Deny rules, SCPs, and block public access must still allow this access.

### 1.4 Optional — IAM role in B for AssumeRole (alternative)

If Source will **assume a role in B** instead of B trusting A’s role on the bucket:

1. Create role e.g. `partner-source-sync-write-role` with **trust policy** allowing `sts:AssumeRole` from **A’s role or root** (tighten to specific ARN).
2. Attach an IAM policy allowing the same S3 actions as above on `DEST_BUCKET_NAME` / prefix.
3. Send Source the **role ARN** and external ID if used.

### 1.5 Testing (B + coordination with A)

**B cannot fully test without A** running at least one upload. Suggested sequence:

1. B applies bucket policy (and KMS if any).
2. A runs a **dry run** then a **small file** sync (see Part 4).
3. B verifies object appears under `DEST_PREFIX` with correct size/etag.
4. A runs sync again; confirm **no duplicate full upload** for unchanged file (CLI skips when ETag/size match).
5. Optional: A adds a new file; confirm only new object transfers.

Record **screenshots or CLI output** (redact secrets) in the deliverable.

### 1.6 What Destination must send to Source (deliverable)

Fill **Part 3** and email/secure-share with Source. Include:

- Destination bucket name, region, prefix.
- Final **bucket policy** JSON (as applied).
- Any **KMS key ARN** and confirmation key policy was updated.
- If using AssumeRole: role ARN, external ID, and session duration guidance.
- **Test evidence:** date, who ran what, result.

---

## Part 2 — What Source (Account A) will implement (summary for B)

Source is responsible for:

1. **IAM role or user** used only for this sync, with:
   - `s3:ListBucket`, `s3:GetObject` (and `GetObjectVersion` if versioning) on **source** bucket/prefix.
   - If **not** using AssumeRole: no extra policy needed on A for **destination** (B’s bucket policy grants cross-account write).
   - If using **AssumeRole** to B: permission in A to `sts:AssumeRole` on B’s role ARN.
2. **AWS CLI v2** on a secure runner (workstation, bastion, or CI) with credentials for that role/user.
3. Operational command: **`aws s3 sync`** (incremental by default).

Source does **not** need to open their bucket to B for a **push** model, unless you later add a pull-based tool.

---

## Part 3 — Deliverable template (Destination → Source)

*Destination completes and returns this.*

| Field | Value |
|-------|--------|
| Destination AWS account ID | |
| Destination bucket name | |
| Destination region | |
| Destination prefix (trailing `/`) | |
| SSE type (none / SSE-S3 / SSE-KMS) | |
| KMS key ARN (if SSE-KMS) | |
| Source principal ARN trusted on bucket policy | |
| AssumeRole ARN in B (if used) | |
| External ID (if used) | |
| Date tested | |
| Test result summary | |

**Appendix A — Final bucket policy (paste exact JSON)**

```json

```

**Appendix B — Final KMS key policy excerpt (if applicable)**

```json

```

---

## Part 4 — Instructions for Source (Account A) after receiving Part 3

### 4.1 Create sync role (example)

Policy on **A** (replace source bucket/prefix):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSourcePrefix",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": [
        "arn:aws:s3:::SOURCE_BUCKET_NAME",
        "arn:aws:s3:::SOURCE_BUCKET_NAME/SOURCE_PREFIX*"
      ]
    }
  ]
}
```

If using **AssumeRole** into B, add a second statement allowing `sts:AssumeRole` on the ARN B provided.

### 4.2 Configure CLI

```bash
aws configure list
# Or use profiles: ~/.aws/credentials and ~/.aws/config
```

### 4.3 Incremental sync commands (rsync-like)

Dry run:

```bash
aws s3 sync s3://SOURCE_BUCKET_NAME/SOURCE_PREFIX s3://DEST_BUCKET_NAME/DEST_PREFIX \
  --dryrun \
  --source-region SOURCE_REGION \
  --region DEST_REGION
```

Execute sync:

```bash
aws s3 sync s3://SOURCE_BUCKET_NAME/SOURCE_PREFIX s3://DEST_BUCKET_NAME/DEST_PREFIX \
  --source-region SOURCE_REGION \
  --region DEST_REGION
```

**Mirror destination to source (delete extras on destination)** — only if both parties agree:

```bash
aws s3 sync s3://SOURCE_BUCKET_NAME/SOURCE_PREFIX s3://DEST_BUCKET_NAME/DEST_PREFIX \
  --delete \
  --source-region SOURCE_REGION \
  --region DEST_REGION
```

Schedule repeats (weekly/monthly) with **Task Scheduler**, **cron**, or in-AWS **EventBridge** invoking the same command.

### 4.4 Troubleshooting

| Symptom | Typical cause |
|---------|----------------|
| AccessDenied on PutObject | B bucket policy or SCP; wrong principal ARN; prefix mismatch |
| AccessDenied on ListBucket | Missing `s3:ListBucket` on dest bucket for your principal |
| KMS AccessDenied | KMS key policy in B |
| Wrong region | `--region` / `--source-region` mismatch |

---

## Part 5 — Optional comparison (same problem, different tool)

| Method | Who runs it | Incremental | Good for |
|--------|-------------|-------------|----------|
| **`aws s3 sync`** | Source | Yes (ETag/size) | On-demand or cron; you control timing |
| **S3 Replication** | AWS S3 | Yes | Continuous push from source bucket rules |
| **AWS DataSync** | AWS service | Yes | Large/scheduled enterprise transfers |

This playbook targets **CLI sync** from Source.

---

*Document version: 1.0 — fill placeholders and remove rows your org does not use.*
