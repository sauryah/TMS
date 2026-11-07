package database

import (
	"context"
	"strings"
	"testing"

	"tms-go-api/internal/config"
)

func TestBuildQueryPostgresDirectly(t *testing.T) {
	// Test empty parameters
	query, args := BuildQueryPostgresDirectly("", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if !strings.Contains(query, "SELECT") {
		t.Errorf("expected SELECT query, got: %s", query)
	}
	if len(args) != 0 {
		t.Errorf("expected 0 args, got %d", len(args))
	}

	// Test filters
	query, args = BuildQueryPostgresDirectly("die-101", "ROUND", "AVAILABLE", "Steel", "1.5", "5.0", "", "", "", "", "", "", "", "", 10, 0)

	if !strings.Contains(query, "ILIKE $1") {
		t.Errorf("expected search query parameter placeholder $1, got: %s", query)
	}
	if !strings.Contains(query, "AND d.die_type = $2") {
		t.Errorf("expected die_type filter placeholder $2, got: %s", query)
	}
	if !strings.Contains(query, "AND d.status = $3") {
		t.Errorf("expected status filter placeholder $3, got: %s", query)
	}
	if !strings.Contains(query, "AND d.casing = $4") {
		t.Errorf("expected casing filter placeholder $4, got: %s", query)
	}
	if !strings.Contains(query, "AND r.current_size >= $5") {
		t.Errorf("expected sizeMin filter placeholder $5, got: %s", query)
	}
	if !strings.Contains(query, "AND r.current_size <= $6") {
		t.Errorf("expected sizeMax filter placeholder $6, got: %s", query)
	}

	if len(args) != 6 {
		t.Errorf("expected 6 args, got %d", len(args))
	}

	// Test location filter
	query, args = BuildQueryPostgresDirectly("", "", "", "", "", "", "", "", "", "", "", "", "", "Machine 1", 10, 0)
	if !strings.Contains(query, "m.name ILIKE $1") {
		t.Errorf("expected location filter placeholder, got: %s", query)
	}
	if len(args) != 1 || args[0] != "%Machine 1%" {
		t.Errorf("expected arg %%Machine 1%%, got: %v", args)
	}

	// Test optimized numeric search query without unindexed CAST expressions
	queryNum, argsNum := BuildQueryPostgresDirectly("1.5", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if strings.Contains(queryNum, "CAST(r.current_size AS TEXT)") {
		t.Errorf("expected no CAST on current_size for numeric query, got: %s", queryNum)
	}
	if !strings.Contains(queryNum, "r.current_size >=") {
		t.Errorf("expected indexed range on current_size for numeric query, got: %s", queryNum)
	}
	if len(argsNum) != 3 {
		t.Errorf("expected 3 args for numeric query (likeVal, min, max), got %d: %v", len(argsNum), argsNum)
	}

	// Test non-numeric search query omits dimension CAST entirely
	queryText, argsText := BuildQueryPostgresDirectly("steel", "", "", "", "", "", "", "", "", "", "", "", "", "", 10, 0)
	if strings.Contains(queryText, "CAST(r.current_size AS TEXT)") {
		t.Errorf("expected no CAST on current_size for non-numeric query, got: %s", queryText)
	}
	if len(argsText) != 1 || argsText[0] != "%steel%" {
		t.Errorf("expected 1 arg %%steel%%, got: %v", argsText)
	}
}

func TestBuildQueryPostgresDirectlyCount(t *testing.T) {
	query, args := BuildQueryPostgresDirectlyCount("", "FLAT", "RUNNING", "", "", "", "10.0", "50.0", "1.0", "5.0", "", "", "", "")
	if !strings.Contains(query, "COUNT(*)") {
		t.Errorf("expected COUNT query, got: %s", query)
	}
	if !strings.Contains(query, "AND d.die_type = $1") {
		t.Errorf("expected die_type filter placeholder $1, got: %s", query)
	}
	if !strings.Contains(query, "AND d.status = $2") {
		t.Errorf("expected status filter placeholder $2, got: %s", query)
	}
	if !strings.Contains(query, "AND f.current_width >= $3") {
		t.Errorf("expected widthMin filter placeholder $3, got: %s", query)
	}
	if !strings.Contains(query, "AND f.current_width <= $4") {
		t.Errorf("expected widthMax filter placeholder $4, got: %s", query)
	}
	if !strings.Contains(query, "AND f.current_thickness >= $5") {
		t.Errorf("expected thickMin filter placeholder $5, got: %s", query)
	}
	if !strings.Contains(query, "AND f.current_thickness <= $6") {
		t.Errorf("expected thickMax filter placeholder $6, got: %s", query)
	}

	if len(args) != 6 {
		t.Errorf("expected 6 args, got %d", len(args))
	}
}


func TestPostgresDB_Integration(t *testing.T) {
	cfg := &config.Config{
		PostgresHost:     "localhost",
		PostgresPort:     "5432",
		PostgresDB:       "tms_dev",
		PostgresUser:     "postgres",
		PostgresPassword: "postgres_password",
	}

	// Try to connect
	db, err := NewPostgresDB(cfg)
	if err != nil {
		t.Skip("Postgres is not running or connection failed, skipping integration tests")
	}
	defer db.Close()

	ctx := context.Background()
	_, _, err = db.GetStats(ctx)
	if err != nil {
		t.Logf("GetStats returned error (could be because schema is not ready): %v", err)
	}

	_, err = db.GetCount(ctx)
	if err != nil {
		t.Logf("GetCount returned error: %v", err)
	}
}
