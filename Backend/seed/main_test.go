package main

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"fitness-tracker/database"
	"fitness-tracker/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestSeedUsersBackfillsExistingRows(t *testing.T) {
	t.Parallel()

	db := newSeedTestDB(t)

	existing := models.User{
		Email:        "alex@example.com",
		PasswordHash: "stale-password",
		Name:         "Old Alex",
	}
	if err := db.Create(&existing).Error; err != nil {
		t.Fatalf("create existing user: %v", err)
	}

	users, err := seedUsers(db)
	if err != nil {
		t.Fatalf("seed users: %v", err)
	}
	if len(users) != 12 {
		t.Fatalf("expected 12 seeded users, got %d", len(users))
	}

	var alex models.User
	if err := db.First(&alex, "email = ?", "alex@example.com").Error; err != nil {
		t.Fatalf("load seeded alex: %v", err)
	}

	if alex.Name != "Alex Johnson" {
		t.Fatalf("expected seeded name to be updated, got %q", alex.Name)
	}
	if alex.DateOfBirth == nil {
		t.Fatal("expected seeded date_of_birth to be backfilled")
	}
	if alex.Age <= 0 {
		t.Fatalf("expected seeded age to be backfilled, got %d", alex.Age)
	}
	if alex.Goal == "" || alex.ActivityLevel == "" || alex.TDEE == 0 {
		t.Fatalf("expected seeded profile fields to be backfilled, got goal=%q activity_level=%q tdee=%d", alex.Goal, alex.ActivityLevel, alex.TDEE)
	}
}

func TestSeedLeaderboardWorkoutPointsCreatesIdempotentLogs(t *testing.T) {
	t.Parallel()

	db := newSeedTestDB(t)

	user := models.User{
		Email:        "leaderboard@example.com",
		PasswordHash: "x",
		Name:         "Leaderboard User",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}

	workouts := []models.Workout{
		{
			UserID:   user.ID,
			Date:     time.Now().UTC().AddDate(0, 0, -2).Truncate(24 * time.Hour),
			Duration: 30,
			Type:     "push",
		},
		{
			UserID:   user.ID,
			Date:     time.Now().UTC().AddDate(0, 0, -1).Truncate(24 * time.Hour),
			Duration: 10,
			Type:     "pull",
		},
	}
	if err := db.Create(&workouts).Error; err != nil {
		t.Fatalf("create workouts: %v", err)
	}

	if err := seedLeaderboardWorkoutPoints(db, workouts); err != nil {
		t.Fatalf("seed leaderboard workout points: %v", err)
	}
	if err := seedLeaderboardWorkoutPoints(db, workouts); err != nil {
		t.Fatalf("seed leaderboard workout points second pass: %v", err)
	}

	var logs []models.UserPointsLog
	if err := db.Order("earned_at asc").Find(&logs).Error; err != nil {
		t.Fatalf("load points logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected 1 idempotent training points log, got %d", len(logs))
	}

	if logs[0].UserID != user.ID {
		t.Fatalf("expected points log user %s, got %s", user.ID, logs[0].UserID)
	}
	if logs[0].Points != 10 || logs[0].ReasonCode != "T1" || logs[0].Pillar != models.PillarTraining {
		t.Fatalf("unexpected points log payload: %+v", logs[0])
	}
	if !logs[0].EarnedAt.Equal(workouts[0].Date) {
		t.Fatalf("expected earned_at %s, got %s", workouts[0].Date, logs[0].EarnedAt)
	}
}

func newSeedTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite db: %v", err)
	}

	if err := database.Migrate(db); err != nil {
		t.Fatalf("migrate sqlite db: %v", err)
	}

	return db
}
