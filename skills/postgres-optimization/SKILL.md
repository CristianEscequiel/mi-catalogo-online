---
name: postgres-optimization
description: Optimize PostgreSQL queries, schema design, and indexing strategies to improve performance and maintainability.
triggers:
  - optimize sql
  - postgres performance
  - slow query
  - sql optimization
  - postgres index
  - database tuning
---

# PostgreSQL Optimization Skill

This skill helps the agent improve **PostgreSQL performance, query efficiency, and database maintainability**.

Use this skill when:

- analyzing slow SQL queries
- designing database schemas
- adding indexes
- reviewing migrations
- optimizing joins and filters
- improving database performance

---

# Core Optimization Principles

PostgreSQL performance mainly depends on:

- proper indexing
- efficient query design
- minimizing unnecessary scans
- correct schema structure

---

# Indexing

Use indexes for frequently queried columns.

Example:

```sql
CREATE INDEX idx_users_email ON users(email);
```
Recommended for:
```sql
WHERE filters

JOIN columns

ORDER BY columns
```

foreign keys

Composite Indexes

Use composite indexes when filtering by multiple columns.

Example:
```sql
CREATE INDEX idx_orders_user_status
ON orders(user_id, status);
```
Column order matters.

Place the most selective column first.

Avoid Full Table Scans

Bad query:
```sql
SELECT * FROM users
WHERE LOWER(email) = 'user@example.com';
```
Better:
```sql
SELECT *
FROM users
WHERE email = 'user@example.com';
```
Avoid functions on indexed columns.

Use LIMIT for Large Queries

Avoid returning huge datasets.

Example:
```sql
SELECT *
FROM products
ORDER BY created_at DESC
LIMIT 50;
```
Pagination improves performance.

Avoid SELECT *

Bad:
```sql
SELECT * FROM users;
```
Better:
```sql
SELECT id, name, email
FROM users;
```
Selecting only required columns reduces IO.

Efficient Joins

Prefer indexed join columns.

Example:
```sql
SELECT u.name, o.total
FROM users u
JOIN orders o ON o.user_id = u.id;
```
Ensure both join columns are indexed.

Use EXPLAIN ANALYZE

To analyze query performance:

EXPLAIN ANALYZE
```sql
SELECT *
FROM orders
WHERE user_id = 10;
```
Check for:

sequential scans

missing indexes

slow joins

Batch Inserts

Prefer batch inserts over multiple queries.

Bad:
```sql
INSERT INTO logs VALUES (...);
INSERT INTO logs VALUES (...);
```
Better:
```sql
INSERT INTO logs VALUES
(...),
(...),
(...);
```
Pagination Strategy

Prefer cursor or keyset pagination.

Example:
```sql
SELECT *
FROM products
WHERE id > 100
ORDER BY id
LIMIT 20;
```
Avoid offset pagination for large datasets.

Query Patterns

Prefer filtering before joining when possible.

Example:
```sql
SELECT *
FROM orders
WHERE created_at > NOW() - INTERVAL '7 days';
```
Reduce dataset size early.

Schema Design

Use appropriate data types.

Example:
```sql
UUID for identifiers
TIMESTAMP for time
BOOLEAN for flags
```
Avoid overly generic types like TEXT when unnecessary.

Anti-Patterns

Avoid:

missing indexes
```sql 
SELECT *
```
large OFFSET pagination

functions in WHERE filters

unbounded queries

Expected Output

When this skill is used the agent should:

propose optimized SQL queries

suggest proper indexes

analyze query plans

recommend schema improvements


---
