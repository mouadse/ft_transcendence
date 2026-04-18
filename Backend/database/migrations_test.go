package database_test

import (
	"fmt"
	"testing"
	"time"

	"fitness-tracker/database"
	"fitness-tracker/models"
	"fitness-tracker/services"

	"github.com/google/uuid"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type migratedExerciseRow struct {
	ID            string
	Name          string
	ExerciseLibID string
}

func TestMigrateCreatesRequiredTables(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)

	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate database: %v", err)
	}

	expectedTables := []string{
		"users",
		"two_factor_secrets",
		"recovery_codes",
		"exercises",
		"weight_entries",
		"workouts",
		"workout_exercises",
		"workout_sets",
		"meals",
		"foods",
		"meal_foods",
		"refresh_tokens",
		"user_sessions",
		"export_jobs",
		"deletion_requests",
	}

	for _, table := range expectedTables {
		if !db.Migrator().HasTable(table) {
			t.Fatalf("expected table %q to exist", table)
		}
	}

	for _, table := range legacyTables() {
		if db.Migrator().HasTable(table) {
			t.Fatalf("expected table %q to be absent", table)
		}
	}
}

func TestMigrateDropsLegacyTablesOnExistingDatabase(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)

	for _, table := range legacyTables() {
		if err := db.Exec("CREATE TABLE " + table + " (id INTEGER PRIMARY KEY)").Error; err != nil {
			t.Fatalf("create legacy table %q: %v", table, err)
		}
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate database: %v", err)
	}

	for _, table := range legacyTables() {
		if db.Migrator().HasTable(table) {
			t.Fatalf("expected legacy table %q to be dropped", table)
		}
	}
}

func TestMigrateAddsNullableSessionIDToExistingRefreshTokens(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)

	if err := db.Exec(`CREATE TABLE refresh_tokens (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		token_hash TEXT NOT NULL,
		user_agent TEXT,
		ip_address TEXT,
		expires_at DATETIME NOT NULL,
		revoked_at DATETIME,
		created_at DATETIME
	)`).Error; err != nil {
		t.Fatalf("create legacy refresh_tokens table: %v", err)
	}

	if err := db.Exec(`INSERT INTO refresh_tokens (id, user_id, token_hash, user_agent, ip_address, expires_at, created_at)
		VALUES ('rt-1', 'user-1', 'hash-1', 'agent', '127.0.0.1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).Error; err != nil {
		t.Fatalf("seed legacy refresh_tokens row: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate database with legacy refresh tokens: %v", err)
	}

	if !db.Migrator().HasColumn(&services.RefreshToken{}, "session_id") {
		t.Fatalf("expected migrated refresh_tokens table to contain session_id")
	}
}

func TestMigrateDropsLegacySQLiteNotificationsTable(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)

	if err := db.Exec(`CREATE TABLE notifications (
		id INTEGER PRIMARY KEY,
		user_id TEXT NOT NULL,
		title TEXT NOT NULL,
		message TEXT NOT NULL
	)`).Error; err != nil {
		t.Fatalf("create legacy notifications table: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate database with legacy notifications: %v", err)
	}

	columnTypes, err := db.Migrator().ColumnTypes("notifications")
	if err != nil {
		t.Fatalf("inspect notifications columns: %v", err)
	}

	var idType string
	for _, columnType := range columnTypes {
		if columnType.Name() == "id" {
			idType = columnType.DatabaseTypeName()
			break
		}
	}
	if idType == "" {
		t.Fatal("expected notifications.id column to exist after migration")
	}
	if idType == "INTEGER" {
		t.Fatalf("expected migrated notifications.id to no longer use INTEGER, got %q", idType)
	}

	user := models.User{
		ID:           uuid.New(),
		Email:        "notifications@example.com",
		PasswordHash: "hash",
		Name:         "Notifications User",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	notification := models.Notification{
		UserID:  user.ID,
		Type:    models.NotificationExportReady,
		Title:   "Export ready",
		Message: "Your export is ready",
	}
	if err := db.Create(&notification).Error; err != nil {
		t.Fatalf("create notification after migration: %v", err)
	}
}

func TestMigrateBackfillsExerciseLibIDForLegacyExercises(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)

	if err := db.Exec(`CREATE TABLE exercises (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		equipment TEXT,
		muscle_group TEXT,
		difficulty TEXT,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME
	)`).Error; err != nil {
		t.Fatalf("create legacy exercises table: %v", err)
	}

	firstID := uuid.NewString()
	secondID := uuid.NewString()

	if err := db.Exec(`INSERT INTO exercises (id, name, equipment, muscle_group, difficulty, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
		       (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		firstID, "Legacy Split Squat", "Dumbbell", "Legs", "Beginner",
		secondID, "Legacy Push-Up", "Bodyweight", "Chest", "Intermediate",
	).Error; err != nil {
		t.Fatalf("seed legacy exercises: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate database with legacy exercises: %v", err)
	}

	var exercises []migratedExerciseRow
	if err := db.Table("exercises").
		Select("CAST(id AS TEXT) AS id, name, exercise_lib_id").
		Order("name asc").
		Scan(&exercises).Error; err != nil {
		t.Fatalf("load migrated exercises: %v", err)
	}

	if len(exercises) != 2 {
		t.Fatalf("expected 2 migrated exercises, got %d", len(exercises))
	}

	for _, exercise := range exercises {
		wantLibID := "local-" + exercise.ID
		if exercise.ExerciseLibID != wantLibID {
			t.Fatalf("expected exercise %q to have exercise_lib_id %q, got %q", exercise.Name, wantLibID, exercise.ExerciseLibID)
		}
	}
}

func TestMigrateBackfillsMissingLeaderboardWorkoutPointsOnce(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)

	if err := database.Migrate(db); err != nil {
		t.Fatalf("initial migrate database: %v", err)
	}

	user := models.User{
		ID:           uuid.New(),
		Email:        "leaderboard-migrate@example.com",
		PasswordHash: "hash",
		Name:         "Leaderboard Migrate User",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	firstDate := time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC)
	secondDate := firstDate.AddDate(0, 0, 1)
	thirdDate := firstDate.AddDate(0, 0, 2)

	workouts := []models.Workout{
		{UserID: user.ID, Date: firstDate, Duration: 45, Type: "push"},
		{UserID: user.ID, Date: secondDate, Duration: 30, Type: "pull"},
		{UserID: user.ID, Date: thirdDate, Duration: 10, Type: "legs"},
	}
	if err := db.Create(&workouts).Error; err != nil {
		t.Fatalf("create workouts: %v", err)
	}

	secondWorkoutID := workouts[1].ID
	existingLog := models.UserPointsLog{
		UserID:         user.ID,
		Points:         10,
		Reason:         "Workout logged (>=15 min)",
		ReasonCode:     "T1",
		Pillar:         models.PillarTraining,
		SourceEntityID: &secondWorkoutID,
		EarnedAt:       secondDate,
	}
	if err := db.Create(&existingLog).Error; err != nil {
		t.Fatalf("create existing points log: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("second migrate database: %v", err)
	}
	if err := database.Migrate(db); err != nil {
		t.Fatalf("third migrate database: %v", err)
	}

	var logs []models.UserPointsLog
	if err := db.Order("earned_at asc").Find(&logs).Error; err != nil {
		t.Fatalf("load points logs: %v", err)
	}

	if len(logs) != 2 {
		t.Fatalf("expected 2 workout points logs after backfill, got %d", len(logs))
	}

	var firstWorkoutLogs int64
	if err := db.Model(&models.UserPointsLog{}).
		Where("source_entity_id = ? AND reason_code = ?", workouts[0].ID, "T1").
		Count(&firstWorkoutLogs).Error; err != nil {
		t.Fatalf("count first workout logs: %v", err)
	}
	if firstWorkoutLogs != 1 {
		t.Fatalf("expected first workout to be backfilled once, got %d logs", firstWorkoutLogs)
	}

	var shortWorkoutLogs int64
	if err := db.Model(&models.UserPointsLog{}).
		Where("source_entity_id = ? AND reason_code = ?", workouts[2].ID, "T1").
		Count(&shortWorkoutLogs).Error; err != nil {
		t.Fatalf("count short workout logs: %v", err)
	}
	if shortWorkoutLogs != 0 {
		t.Fatalf("expected short workout to remain without leaderboard points, got %d logs", shortWorkoutLogs)
	}
}

func TestMigrateBackfillsLeaderboardWorkoutPointsAcrossBatches(t *testing.T) {
	t.Parallel()

	db := openTestDB(t)

	if err := database.Migrate(db); err != nil {
		t.Fatalf("initial migrate database: %v", err)
	}

	user := models.User{
		ID:           uuid.New(),
		Email:        "leaderboard-batch@example.com",
		PasswordHash: "hash",
		Name:         "Leaderboard Batch User",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	const eligibleWorkouts = 505

	workouts := make([]models.Workout, 0, eligibleWorkouts)
	baseDate := time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)
	for i := 0; i < eligibleWorkouts; i++ {
		workouts = append(workouts, models.Workout{
			UserID:   user.ID,
			Date:     baseDate.AddDate(0, 0, i),
			Duration: 20,
			Type:     "push",
		})
	}
	if err := db.Create(&workouts).Error; err != nil {
		t.Fatalf("create workouts: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("second migrate database: %v", err)
	}

	var count int64
	if err := db.Model(&models.UserPointsLog{}).
		Where("user_id = ? AND reason_code = ?", user.ID, "T1").
		Count(&count).Error; err != nil {
		t.Fatalf("count backfilled logs: %v", err)
	}
	if count != eligibleWorkouts {
		t.Fatalf("expected %d workout points logs across batches, got %d", eligibleWorkouts, count)
	}
}

func legacyTables() []string {
	return []string{
		"friendships",
		"messages",
		"weekly_adjustments",
		"program_enrollments",
		"program_progresses",
	}
}

func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite database: %v", err)
	}

	return db
}
