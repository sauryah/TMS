package database

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"math"
	"strconv"
	"strings"
	"time"

	"tms-go-api/internal/config"
	"github.com/lib/pq"
)

type DieRepresentation struct {
	ID                     int64   `json:"-"`
	DieID                  string  `json:"die_id"`
	DieType                string  `json:"die_type"`
	Casing                 string  `json:"casing"`
	Status                 string  `json:"status"`
	Location               string  `json:"location"`
	SetName                string  `json:"set_name"`
	MachineName            string  `json:"machine_name"`
	CurrentSet             *int    `json:"current_set"`
	RackID                 *int    `json:"rack_id,omitempty"`
	RackName               string  `json:"rack_name,omitempty"`
	Shelf                  *int    `json:"shelf,omitempty"`
	CurrentSize            *string `json:"current_size,omitempty"`
	CurrentWidth           *string `json:"current_width,omitempty"`
	CurrentThickness       *string `json:"current_thickness,omitempty"`
	Radius                 *string `json:"radius,omitempty"`
}

func (d *DieRepresentation) ComputeLocation() {
	if d.MachineName != "" {
		d.Location = d.MachineName
	} else if d.SetName != "" {
		d.Location = d.SetName
	} else {
		d.Location = "Unassigned"
	}
}

type DBStats struct {
	MaxOpenConnections int   `json:"max_open_connections"`
	OpenConnections    int   `json:"open_connections"`
	InUse              int   `json:"in_use"`
	Idle               int   `json:"idle"`
	WaitCount          int64 `json:"wait_count"`
	WaitDurationMs     int64 `json:"wait_duration_ms"`
	MaxIdleClosed      int64 `json:"max_idle_closed"`
	MaxLifetimeClosed  int64 `json:"max_lifetime_closed"`
}

type PostgresDB struct {
	*sql.DB
}

func (db *PostgresDB) GetPoolStats() DBStats {
	if db == nil || db.DB == nil {
		return DBStats{}
	}
	s := db.DB.Stats()
	return DBStats{
		MaxOpenConnections: s.MaxOpenConnections,
		OpenConnections:    s.OpenConnections,
		InUse:              s.InUse,
		Idle:               s.Idle,
		WaitCount:          s.WaitCount,
		WaitDurationMs:     s.WaitDuration.Milliseconds(),
		MaxIdleClosed:      s.MaxIdleClosed,
		MaxLifetimeClosed:  s.MaxLifetimeClosed,
	}
}

func NewPostgresDB(cfg *config.Config) (*PostgresDB, error) {
	connStr := cfg.PostgresConnStr()

	var db *sql.DB
	var err error
	for i := 0; i < 5; i++ {
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			err = db.Ping()
			if err == nil {
				slog.Info("Successfully connected to PostgreSQL database.")
				db.SetMaxIdleConns(10)
				db.SetMaxOpenConns(50)
				db.SetConnMaxLifetime(time.Hour)
				db.SetConnMaxIdleTime(15 * time.Minute)
				return &PostgresDB{db}, nil
			}
		}
		slog.Warn("Failed to connect to database", "attempt", i+1, "max", 5, "error", err)
		time.Sleep(time.Duration(i+1) * 2 * time.Second)
	}
	return nil, err
}

func (db *PostgresDB) IsUserActive(ctx context.Context, userID int) (bool, error) {
	var isActive bool
	err := db.QueryRowContext(ctx, "SELECT is_active FROM users_user WHERE id = $1", userID).Scan(&isActive)
	if err != nil {
		return false, err
	}
	return isActive, nil
}

func appendDimensionFilters(args []interface{}, argCounter int, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax string) ([]string, []interface{}, int) {
	var sqlParts []string
	appendFilter := func(column, value string) {
		sqlParts = append(sqlParts, fmt.Sprintf("AND %s $%d", column, argCounter))
		args = append(args, value)
		argCounter++
	}
	if sizeMin != "" {
		appendFilter("r.current_size >=", sizeMin)
	}
	if sizeMax != "" {
		appendFilter("r.current_size <=", sizeMax)
	}
	if widthMin != "" {
		appendFilter("f.current_width >=", widthMin)
	}
	if widthMax != "" {
		appendFilter("f.current_width <=", widthMax)
	}
	if thickMin != "" {
		appendFilter("f.current_thickness >=", thickMin)
	}
	if thickMax != "" {
		appendFilter("f.current_thickness <=", thickMax)
	}
	return sqlParts, args, argCounter
}

func buildWhereClauses(q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location string) ([]string, []interface{}, int) {
	var sqlParts []string
	var args []interface{}
	argCounter := 1

	if q != "" {
		cleanQ := strings.TrimSpace(strings.Trim(q, `"'`))
		dieIdPrefix := cleanQ + "%"
		likeVal := "%" + cleanQ + "%"
		qNumStr := cleanQ
		if strings.HasSuffix(strings.ToLower(qNumStr), "mm") {
			qNumStr = strings.TrimSpace(qNumStr[:len(qNumStr)-2])
		}

		if qFloat, err := strconv.ParseFloat(qNumStr, 64); err == nil {
			var numMin, numMax float64
			exact := false
			if strings.Contains(qNumStr, ".") {
				parts := strings.Split(qNumStr, ".")
				decPlaces := len(parts[1])
				if decPlaces >= 3 {
					exact = true
					numMin = qFloat
				} else {
					step := math.Pow(10, -float64(decPlaces))
					numMin = qFloat
					numMax = qFloat + step
				}
			} else {
				numMin = qFloat
				numMax = qFloat + 1.0
			}

			if exact {
				sqlParts = append(sqlParts, fmt.Sprintf(`
					AND (
						d.die_id ILIKE $%d 
						OR d.casing ILIKE $%d 
						OR d.status ILIKE $%d 
						OR s.name ILIKE $%d 
						OR m.name ILIKE $%d
						OR r.current_size = $%d
						OR f.current_width = $%d
						OR f.current_thickness = $%d
					)
				`, argCounter, argCounter+1, argCounter+1, argCounter+1, argCounter+1, argCounter+2, argCounter+2, argCounter+2))
				args = append(args, dieIdPrefix, likeVal, fmt.Sprintf("%.3f", numMin))
				argCounter += 3
			} else {
				sqlParts = append(sqlParts, fmt.Sprintf(`
					AND (
						d.die_id ILIKE $%d 
						OR d.casing ILIKE $%d 
						OR d.status ILIKE $%d 
						OR s.name ILIKE $%d 
						OR m.name ILIKE $%d
						OR (r.current_size >= $%d AND r.current_size < $%d)
						OR (f.current_width >= $%d AND f.current_width < $%d)
						OR (f.current_thickness >= $%d AND f.current_thickness < $%d)
					)
				`, argCounter, argCounter+1, argCounter+1, argCounter+1, argCounter+1, argCounter+2, argCounter+3, argCounter+2, argCounter+3, argCounter+2, argCounter+3))
				args = append(args, dieIdPrefix, likeVal, fmt.Sprintf("%.3f", numMin), fmt.Sprintf("%.3f", numMax))
				argCounter += 4
			}
		} else {
			sqlParts = append(sqlParts, fmt.Sprintf(`
				AND (
					d.die_id ILIKE $%d 
					OR d.casing ILIKE $%d 
					OR d.status ILIKE $%d 
					OR s.name ILIKE $%d 
					OR m.name ILIKE $%d
				)
			`, argCounter, argCounter+1, argCounter+1, argCounter+1, argCounter+1))
			args = append(args, dieIdPrefix, likeVal)
			argCounter += 2
		}
	}

	if dieType != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.die_type = $%d", argCounter))
		args = append(args, dieType)
		argCounter++
	}
	if statusVal != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.status = $%d", argCounter))
		args = append(args, statusVal)
		argCounter++
	}
	if casing != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND d.casing = $%d", argCounter))
		args = append(args, casing)
		argCounter++
	}

	dimParts, dimArgs, dimCounter := appendDimensionFilters(args, argCounter, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
	sqlParts = append(sqlParts, dimParts...)
	args = dimArgs
	argCounter = dimCounter

	if machineID != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND m.id = $%d", argCounter))
		args = append(args, machineID)
		argCounter++
	}
	if setID != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND s.id = $%d", argCounter))
		args = append(args, setID)
		argCounter++
	}
	if unassigned == "true" {
		sqlParts = append(sqlParts, "AND d.current_set_id IS NULL")
	}
	if location != "" {
		cleanLoc := strings.Trim(location, `"'`)
		sqlParts = append(sqlParts, fmt.Sprintf("AND (m.name ILIKE $%d OR s.name ILIKE $%d)", argCounter, argCounter))
		args = append(args, "%"+cleanLoc+"%")
		argCounter++
	}

	return sqlParts, args, argCounter
}


func BuildQueryPostgresDirectly(q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location string, limit, offset int) (string, []interface{}) {
	var sqlParts []string
	var args []interface{}

	sqlParts = append(sqlParts, `
		SELECT 
			d.id, d.die_id, d.die_type, d.casing, d.status, d.current_set_id,
			s.name as set_name,
			m.name as machine_name,
			r.current_size,
			f.current_width, f.current_thickness, f.radius
		FROM dies_die d
		LEFT JOIN machines_set s ON d.current_set_id = s.id
		LEFT JOIN machines_machine m ON s.machine_id = m.id
		LEFT JOIN dies_rounddie r ON d.id = r.die_id
		LEFT JOIN dies_flatdie f ON d.id = f.die_id
		WHERE 1=1
	`)

	whereParts, whereArgs, _ := buildWhereClauses(q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location)
	sqlParts = append(sqlParts, whereParts...)
	args = append(args, whereArgs...)

	sqlParts = append(sqlParts, fmt.Sprintf("ORDER BY d.die_id ASC LIMIT %d OFFSET %d", limit, offset))

	return strings.Join(sqlParts, "\n"), args
}

func (db *PostgresDB) QueryPostgresDirectly(ctx context.Context, q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location string, limit, offset int) ([]DieRepresentation, error) {
	query, args := BuildQueryPostgresDirectly(q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location, limit, offset)
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanDies(rows)
}

func BuildQueryPostgresDirectlyCount(q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location string) (string, []interface{}) {
	var sqlParts []string
	var args []interface{}

	sqlParts = append(sqlParts, `
		SELECT COUNT(*)
		FROM dies_die d
		LEFT JOIN machines_set s ON d.current_set_id = s.id
		LEFT JOIN machines_machine m ON s.machine_id = m.id
		LEFT JOIN dies_rounddie r ON d.id = r.die_id
		LEFT JOIN dies_flatdie f ON d.id = f.die_id
		WHERE 1=1
	`)

	whereParts, whereArgs, _ := buildWhereClauses(q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location)
	sqlParts = append(sqlParts, whereParts...)
	args = append(args, whereArgs...)

	return strings.Join(sqlParts, "\n"), args
}

func (db *PostgresDB) QueryPostgresDirectlyCount(ctx context.Context, q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location string) (int, error) {
	query, args := BuildQueryPostgresDirectlyCount(q, dieType, statusVal, casing, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location)
	var count int
	err := db.QueryRowContext(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}


func (db *PostgresDB) QueryPostgresByIDs(ctx context.Context, hitIDs []int64, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax, machineID, setID, unassigned, location string) ([]DieRepresentation, error) {
	var sqlParts []string
	var args []interface{}
	argCounter := 1

	sqlParts = append(sqlParts, `
		SELECT 
			d.id, d.die_id, d.die_type, d.casing, d.status, d.current_set_id,
			s.name as set_name,
			m.name as machine_name,
			r.current_size,
			f.current_width, f.current_thickness, f.radius
		FROM dies_die d
		LEFT JOIN machines_set s ON d.current_set_id = s.id
		LEFT JOIN machines_machine m ON s.machine_id = m.id
		LEFT JOIN dies_rounddie r ON d.id = r.die_id
		LEFT JOIN dies_flatdie f ON d.id = f.die_id
		WHERE d.id = ANY($1)
	`)
	args = append(args, pq.Array(hitIDs))
	argCounter++

	dimParts, dimArgs, dimCounter := appendDimensionFilters(args, argCounter, sizeMin, sizeMax, widthMin, widthMax, thickMin, thickMax)
	sqlParts = append(sqlParts, dimParts...)
	args = dimArgs
	argCounter = dimCounter

	if machineID != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND m.id = $%d", argCounter))
		args = append(args, machineID)
		argCounter++
	}
	if setID != "" {
		sqlParts = append(sqlParts, fmt.Sprintf("AND s.id = $%d", argCounter))
		args = append(args, setID)
		argCounter++
	}
	if unassigned == "true" {
		sqlParts = append(sqlParts, "AND d.current_set_id IS NULL")
	}
	if location != "" {
		cleanLoc := strings.Trim(location, `"'`)
		sqlParts = append(sqlParts, fmt.Sprintf("AND (m.name ILIKE $%d OR s.name ILIKE $%d)", argCounter, argCounter))
		args = append(args, "%"+cleanLoc+"%")
		argCounter++
	}

	query := strings.Join(sqlParts, "\n")
	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanDies(rows)
}

func (db *PostgresDB) GetStats(ctx context.Context) (map[string]int, int, error) {
	rows, err := db.QueryContext(ctx, "SELECT status, COUNT(*) FROM dies_die GROUP BY status")
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	stats := map[string]int{
		"AVAILABLE":   0,
		"RUNNING":     0,
		"CLEANING":    0,
		"POLISHING":   0,
		"DAMAGED":     0,
		"SCRAPPED":    0,
		"MISSING":     0,
		"MAINTENANCE": 0,
	}
	total := 0

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return nil, 0, err
		}
		stats[status] = count
		total += count
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return stats, total, nil
}

func (db *PostgresDB) GetCount(ctx context.Context) (int, error) {
	var count int
	err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM dies_die").Scan(&count)
	return count, err
}

func scanDies(rows *sql.Rows) ([]DieRepresentation, error) {
	var dies []DieRepresentation
	for rows.Next() {
		var d DieRepresentation
		var setID sql.NullInt64
		var setName, machineName sql.NullString
		var size, width, thickness, radius sql.NullString

		err := rows.Scan(
			&d.ID, &d.DieID, &d.DieType, &d.Casing, &d.Status, &setID,
			&setName, &machineName, &size, &width, &thickness, &radius,
		)
		if err != nil {
			return nil, err
		}

		if setID.Valid {
			val := int(setID.Int64)
			d.CurrentSet = &val
		}
		if setName.Valid {
			d.SetName = setName.String
		}
		if machineName.Valid {
			d.MachineName = machineName.String
		}
		d.ComputeLocation()

		if d.DieType == "ROUND" && size.Valid {
			d.CurrentSize = &size.String
		} else if d.DieType == "FLAT" {
			if width.Valid {
				d.CurrentWidth = &width.String
			}
			if thickness.Valid {
				d.CurrentThickness = &thickness.String
			}
			if radius.Valid {
				d.Radius = &radius.String
			}
		}

		d.ComputeLocation()
		dies = append(dies, d)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return dies, nil
}
